# ملخص تعديلات الـ Backend - نظام التفعيل الجديد

## ✅ التعديلات المكتملة

### 1. تعديلات Models

#### `models/serial.js`
- ✅ إضافة حقل `productCode` (كود المنتج/السيريال الخارجي مثل M-102487)
- ✅ إضافة حقل `internalSerial` (السيريال الداخلي للتفعيل مثل RXM-3055)
- ✅ الاحتفاظ بـ `serialNumber` للحفاظ على التوافق مع الكود القديم

#### `models/warranty.js`
- ✅ إضافة حقل `productCode` (كود المنتج المرتبط)
- ✅ إضافة حقل `internalSerial` (السيريال الداخلي المستخدم في التفعيل)
- ✅ الاحتفاظ بـ `serialNumber` للحفاظ على التوافق

---

### 2. تعديلات Endpoints

#### ✅ `POST /addSerial`
**التعديلات:**
- استقبال `productCode`, `internalSerial`, `branch` بدلاً من `serialNumber`, `branch`
- التحقق من عدم تكرار `productCode` و `internalSerial`
- ربط السيريال بالمنتج

**Request Body:**
```json
{
  "productCode": "M-102487",
  "internalSerial": "RXM-3055",
  "branch": "الفرع"
}
```

**Response:**
```json
{
  "msg": "success",
  "serials": [...]
}
```

---

#### ✅ `POST /checkSerial` (محدث)
**التعديلات:**
- استقبال `productCode` (السيريال الخارجي من الكرتونة)
- البحث عن السيريال باستخدام `productCode`
- إرجاع تفاصيل المنتج المرتبط
- طلب السيريال الداخلي للتفعيل

**Request Body:**
```json
{
  "productCode": "M-102487"
}
```

**Response (نجاح):**
```json
{
  "status": "ok",
  "productCode": "M-102487",
  "productInfo": {
    "code": "M-102487",
    "name": "منتج"
  },
  "token": "JWT_TOKEN"
}
```

**Response (مفعل):**
```json
{
  "status": "act",
  "owner": {
    "name": "أحمد",
    "phone": "123"
  }
}
```

---

#### ✅ `POST /verifyInternalSerial` (جديد)
**الوظيفة:**
- التحقق من تطابق السيريال الداخلي مع كود المنتج
- إرجاع رسالة "في حاجة غلط" إذا كان السيريال خاطئ
- إرجاع token للتفعيل إذا كان صحيح

**Request Body:**
```json
{
  "productCode": "M-102487",
  "internalSerial": "RXM-3055"
}
```

**Response (صحيح):**
```json
{
  "success": true,
  "msg": "السيريال صحيح",
  "token": "JWT_TOKEN",
  "productCode": "M-102487",
  "internalSerial": "RXM-3055"
}
```

**Response (خاطئ):**
```json
{
  "success": false,
  "msg": "في حاجة غلط"
}
```

---

#### ✅ `POST /activation` (محدث)
**التعديلات:**
- استقبال `productCode` و `internalSerial`
- التحقق من صحة السيريال الداخلي قبل الحفظ
- ربط الضمان بالمنتج عبر `productCode`
- حفظ `productCode` و `internalSerial` في سجل الضمان

**Request Body (FormData):**
```
name: "أحمد"
phoneNumber: "01234567890"
birthdate: "1990-01-01"
address: "العنوان"
brand: "الماركة"
model: "الموديل"
color: "اللون"
email: "email@example.com"
productCode: "M-102487"
internalSerial: "RXM-3055"
createdAt: "2024-01-01T00:00:00.000Z"
image: [File]
```

**Response:**
```json
{
  "msg": "success",
  "activation": {...},
  "imageUrl": "uploads/..."
}
```

---

#### ✅ `GET /viewSerials` (محدث تلقائياً)
- يعرض جميع السيريالات مع `productCode` و `internalSerial`
- لا يحتاج تعديلات إضافية

---

#### ✅ `POST /updateBranch` (محدث)
- يعمل مع `productCode` أو `serialNumber`
- للحفاظ على التوافق مع الكود القديم

---

#### ✅ `PUT /updateSerial` (جديد)
**الوظيفة:**
- تحديث `productCode`, `internalSerial`, `branch`

**Request Body:**
```json
{
  "serialId": "ID",
  "productCode": "M-102487",
  "internalSerial": "RXM-3055",
  "branch": "الفرع"
}
```

---

#### ✅ `POST /deleteSerial` (محدث)
- يعمل مع `productCode` أو `serialNumber`
- يحذف الضمان المرتبط أيضاً

---

## 📋 تدفق العمل الجديد

### للعميل (تفعيل الضمان):

1. **الخطوة 1:** العميل يدخل السيريال الخارجي (productCode) من الكرتونة
   - `POST /checkSerial` مع `{ productCode: "M-102487" }`
   - النظام يتحقق ويعرض تفاصيل المنتج

2. **الخطوة 2:** العميل يدخل السيريال الداخلي
   - `POST /verifyInternalSerial` مع `{ productCode: "M-102487", internalSerial: "RXM-3055" }`
   - إذا صح: يعطي token للتفعيل
   - إذا غلط: رسالة "في حاجة غلط"

3. **الخطوة 3:** تسجيل البيانات ورفع صورة شهادة الضمان
   - `POST /activation` مع جميع البيانات + `productCode` و `internalSerial`

### للإداري (إدارة السيريالات):

1. **إضافة سيريال جديد:**
   - `POST /addSerial` مع `productCode`, `internalSerial`, `branch`

2. **عرض السيريالات:**
   - `GET /viewSerials` - يعرض جميع السيريالات مع productCode و internalSerial

3. **تعديل السيريال:**
   - `PUT /updateSerial` مع `serialId` والحقول المطلوبة

4. **حذف السيريال:**
   - `POST /deleteSerial` مع `productCode` أو `serialNumber`

---

## 🔄 التوافق مع الكود القديم

- ✅ جميع endpoints تعمل مع `serialNumber` القديم و `productCode` الجديد
- ✅ استخدام `$or` في queries للبحث في كلا الحقلين
- ✅ حفظ `serialNumber = productCode` عند إضافة سيريال جديد

---

## 📝 ملاحظات مهمة

1. **التحقق من السيريال الخارجي:** يتم البحث في `productCode` أولاً
2. **التحقق من السيريال الداخلي:** يجب أن يطابق `internalSerial` الموجود في قاعدة البيانات
3. **رسالة الخطأ:** "في حاجة غلط" عند إدخال سيريال داخلي خاطئ
4. **ربط المنتج:** يتم ربط السيريال بالمنتج عبر `productCode` الذي يجب أن يطابق `code` في جدول Products

---

## 🚀 الخطوات التالية

1. ✅ تعديلات Backend مكتملة
2. ⏳ تعديلات Frontend (راجع ملف `FRONTEND_MODIFICATIONS.md`)
3. ⏳ اختبار جميع endpoints
4. ⏳ تحديث قاعدة البيانات (migration) إذا لزم الأمر

