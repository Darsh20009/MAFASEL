const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const Meeting = require('./meeting.model');
const User = require('../users/user.model');
const { fireNotify } = require('../notifications/notification.service');

const QMEET_BASE = process.env.QMEET_BASE_URL || 'https://qiroxstudio.online/api/qmeet/v1';
const QMEET_KEY = process.env.QMEET_API_KEY || '';

async function qmeetRequest(method, path, body) {
  const res = await fetch(`${QMEET_BASE}${path}`, {
    method,
    headers: {
      'x-qmeet-api-key': QMEET_KEY,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`QMeet API error ${res.status}: ${text}`);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return {};
  try { return await res.json(); } catch { return {}; }
}

const CAN_CREATE = ['doctor', 'admin', 'moderator'];

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const role = req.session.user.role;

    let query;
    if (CAN_CREATE.includes(role)) {
      query = { $or: [{ createdBy: userId }, { patient: userId }] };
    } else {
      query = { $or: [{ patient: userId }, { createdBy: userId }] };
    }

    const meetings = await Meeting.find(query)
      .populate('createdBy', 'name role avatar')
      .populate('patient', 'name role avatar')
      .sort({ scheduledAt: -1 })
      .limit(50);

    const patients = CAN_CREATE.includes(role)
      ? await User.find({ role: 'patient' }).select('name email phone').limit(200)
      : [];

    res.render('pages/meetings', {
      title: 'الاجتماعات',
      meetings,
      patients,
      canCreate: CAN_CREATE.includes(role)
    });
  } catch (err) {
    console.error('Meetings list error:', err);
    res.render('pages/meetings', { title: 'الاجتماعات', meetings: [], patients: [], canCreate: false });
  }
});

router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const role = req.session.user.role;
    if (!CAN_CREATE.includes(role)) {
      req.session.error = 'غير مصرح لك بإنشاء اجتماعات';
      return res.redirect('/meetings');
    }

    const { title, scheduledAt, durationMinutes, patientId, notes } = req.body;
    if (!title || !scheduledAt) {
      req.session.error = 'العنوان والموعد مطلوبان';
      return res.redirect('/meetings');
    }

    const dur = parseInt(durationMinutes) || 30;
    const schedDate = new Date(scheduledAt);
    if (isNaN(schedDate.getTime())) {
      req.session.error = 'تاريخ غير صالح';
      return res.redirect('/meetings');
    }

    const qmeetData = await qmeetRequest('POST', '/meetings', {
      title,
      scheduledAt: schedDate.toISOString(),
      durationMinutes: dur
    });

    const meeting = await Meeting.create({
      qmeetId: qmeetData.id,
      roomName: qmeetData.roomName,
      joinCode: qmeetData.joinCode,
      meetingLink: qmeetData.meetingLink,
      joinUrl: qmeetData.joinUrl,
      title,
      scheduledAt: schedDate,
      durationMinutes: dur,
      status: 'scheduled',
      createdBy: req.session.user._id,
      patient: patientId || null,
      notes: notes || ''
    });

    if (patientId) {
      fireNotify(req.app, patientId, 'موعد جديد', `تم تحديد موعد اجتماع: "${title}" بتاريخ ${schedDate.toLocaleDateString('ar-SA')}`, {
        type: 'info', link: '/meetings/' + meeting._id
      }).catch(() => {});
    }

    req.session.success = 'تم إنشاء الاجتماع بنجاح';
    res.redirect('/meetings/' + meeting._id);
  } catch (err) {
    console.error('Create meeting error:', err);
    req.session.error = 'حدث خطأ في إنشاء الاجتماع: ' + (err.message || '');
    res.redirect('/meetings');
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const meeting = await Meeting.findById(req.params.id)
      .populate('createdBy', 'name role avatar specialty')
      .populate('patient', 'name email phone avatar');

    if (!meeting) {
      req.session.error = 'الاجتماع غير موجود';
      return res.redirect('/meetings');
    }

    const isParticipant =
      meeting.createdBy._id.toString() === userId.toString() ||
      (meeting.patient && meeting.patient._id.toString() === userId.toString()) ||
      ['admin', 'moderator'].includes(req.session.user.role);

    if (!isParticipant) {
      req.session.error = 'غير مصرح لك بالوصول';
      return res.redirect('/meetings');
    }

    let qmeetInfo = null;
    if (meeting.roomName && meeting.status !== 'cancelled') {
      try {
        qmeetInfo = await qmeetRequest('GET', '/meetings/' + meeting.roomName);
      } catch (_) {}
    }

    res.render('pages/meeting-room', {
      title: meeting.title,
      meeting,
      qmeetInfo,
      isCreator: meeting.createdBy._id.toString() === userId.toString()
    });
  } catch (err) {
    console.error('Meeting detail error:', err);
    req.session.error = 'حدث خطأ';
    res.redirect('/meetings');
  }
});

router.post('/:id/cancel', isAuthenticated, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) { req.session.error = 'غير موجود'; return res.redirect('/meetings'); }

    const userId = req.session.user._id;
    const isOwner = meeting.createdBy.toString() === userId.toString();
    const isAdmin = ['admin', 'moderator'].includes(req.session.user.role);
    if (!isOwner && !isAdmin) { req.session.error = 'غير مصرح'; return res.redirect('/meetings'); }

    if (meeting.roomName && meeting.status !== 'cancelled') {
      try { await qmeetRequest('DELETE', '/meetings/' + meeting.roomName); } catch (_) {}
    }

    meeting.status = 'cancelled';
    meeting.cancelledAt = new Date();
    await meeting.save();

    if (meeting.patient) {
      fireNotify(req.app, meeting.patient.toString(), 'تم إلغاء الاجتماع', `تم إلغاء الموعد: "${meeting.title}"`, {
        type: 'warning', link: '/meetings'
      }).catch(() => {});
    }

    req.session.success = 'تم إلغاء الاجتماع';
    res.redirect('/meetings');
  } catch (err) {
    req.session.error = 'حدث خطأ';
    res.redirect('/meetings');
  }
});

router.post('/:id/notify', isAuthenticated, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate('patient', 'name');
    if (!meeting || !meeting.patient) return res.status(400).json({ error: 'لا يوجد مستفيد مرتبط' });

    const dateStr = new Date(meeting.scheduledAt).toLocaleString('ar-SA', { dateStyle: 'long', timeStyle: 'short' });
    await fireNotify(req.app, meeting.patient._id.toString(),
      '📅 تذكير باجتماع',
      `موعدك "${meeting.title}" بتاريخ ${dateStr}. رمز الانضمام: ${meeting.joinCode}`,
      { type: 'info', link: '/meetings/' + meeting._id }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
