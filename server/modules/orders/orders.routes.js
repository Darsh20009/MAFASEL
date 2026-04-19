const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const Order = require('./order.model');
const { fireNotify, fireNotifyAdmins } = require('../notifications/notification.service');

const medicines = [
  { id: 1, name: 'بنادول أكسترا', category: 'مسكنات', price: 15, description: 'مسكن للألم وخافض للحرارة', prescription: false },
  { id: 2, name: 'أموكسيسيلين 500mg', category: 'مضادات حيوية', price: 35, description: 'مضاد حيوي واسع المجال', prescription: true },
  { id: 3, name: 'أوميبرازول 20mg', category: 'معدة', price: 25, description: 'لعلاج حموضة المعدة', prescription: false },
  { id: 4, name: 'ميتفورمين 850mg', category: 'سكري', price: 20, description: 'لعلاج السكري النوع الثاني', prescription: true },
  { id: 5, name: 'فيتامين د 5000', category: 'فيتامينات', price: 30, description: 'مكمل فيتامين د', prescription: false },
  { id: 6, name: 'لوسارتان 50mg', category: 'ضغط', price: 28, description: 'لعلاج ارتفاع ضغط الدم', prescription: true },
  { id: 7, name: 'سيتريزين 10mg', category: 'حساسية', price: 12, description: 'مضاد للحساسية', prescription: false },
  { id: 8, name: 'أتورفاستاتين 20mg', category: 'كوليسترول', price: 40, description: 'لخفض الكوليسترول', prescription: true }
];

router.get('/', isAuthenticated, async (req, res) => {
  const orders = await Order.find({ patient: req.session.user._id }).sort({ createdAt: -1 });
  res.render('pages/pharmacy', { title: 'الصيدلية', medicines, orders });
});

router.post('/order', isAuthenticated, async (req, res) => {
  try {
    const { items, address, notes } = req.body;
    const parsedItems = JSON.parse(items);
    let totalPrice = 0;
    const orderItems = parsedItems.map(item => {
      const med = medicines.find(m => m.id === item.id);
      if (!med) throw new Error('دواء غير موجود');
      const subtotal = med.price * item.quantity;
      totalPrice += subtotal;
      return { name: med.name, quantity: item.quantity, price: med.price, prescription: med.prescription };
    });

    const order = await Order.create({
      patient: req.session.user._id,
      items: orderItems,
      totalPrice,
      address,
      notes,
      trackingNumber: 'MF-' + Date.now().toString(36).toUpperCase()
    });

    await fireNotify(req.app, req.session.user._id, 'تم استلام طلبك', `طلب رقم ${order.trackingNumber} قيد المعالجة`, {
      type: 'success', link: '/pharmacy'
    });
    await fireNotifyAdmins(req.app, 'طلب صيدلية جديد', `طلب جديد من ${req.session.user.name} بقيمة ${totalPrice} ريال`, {
      type: 'info', link: '/admin/orders'
    });

    req.session.success = 'تم إرسال طلبك بنجاح';
    res.json({ success: true, orderId: order._id });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في إرسال الطلب' });
  }
});

module.exports = router;
