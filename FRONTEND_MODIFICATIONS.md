<!-- # تعديلات الفرونت إند - نظام التفعيل الجديد

## 📋 ملخص التعديلات

بناءً على المتطلبات الجديدة:
- **السيريال الخارجي** (على الكرتونة) = `M-102487` (كود المنتج)
- **السيريال الداخلي** (للتأكيد) = `RXM-3055`

---

## 1️⃣ صفحة إضافة السيريالات (الداشبورد)

### التعديلات المطلوبة:

#### قبل (الحقول القديمة):
```html
- serialNumber (السيريال)
- branch (الفرع)
```

#### بعد (الحقول الجديدة):
```html
- productCode (كود المنتج/السيريال الخارجي) - مثل: M-102487
- internalSerial (السيريال الداخلي) - مثل: RXM-3055
- branch (الفرع)
```

### مثال الكود (React/Angular/Vue):

#### React Component:
```jsx
import React, { useState } from 'react';

function AddSerialForm() {
  const [formData, setFormData] = useState({
    productCode: '',      // كود المنتج/السيريال الخارجي
    internalSerial: '',    // السيريال الداخلي
    branch: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/addSerial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productCode: formData.productCode,
          internalSerial: formData.internalSerial,
          branch: formData.branch
        })
      });

      const data = await response.json();
      if (data.msg === 'success') {
        alert('تم إضافة السيريال بنجاح');
        // Reset form
        setFormData({ productCode: '', internalSerial: '', branch: '' });
      }
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ أثناء إضافة السيريال');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>كود المنتج (السيريال الخارجي):</label>
        <input
          type="text"
          value={formData.productCode}
          onChange={(e) => setFormData({...formData, productCode: e.target.value})}
          placeholder="مثال: M-102487"
          required
        />
      </div>

      <div>
        <label>السيريال الداخلي:</label>
        <input
          type="text"
          value={formData.internalSerial}
          onChange={(e) => setFormData({...formData, internalSerial: e.target.value})}
          placeholder="مثال: RXM-3055"
          required
        />
      </div>

      <div>
        <label>الفرع:</label>
        <input
          type="text"
          value={formData.branch}
          onChange={(e) => setFormData({...formData, branch: e.target.value})}
          required
        />
      </div>

      <button type="submit">إضافة السيريال</button>
    </form>
  );
}

export default AddSerialForm;
```

#### Angular Component:
```typescript
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-add-serial',
  template: `
    <form (ngSubmit)="onSubmit()">
      <div>
        <label>كود المنتج (السيريال الخارجي):</label>
        <input 
          type="text" 
          [(ngModel)]="formData.productCode" 
          name="productCode"
          placeholder="مثال: M-102487"
          required
        />
      </div>

      <div>
        <label>السيريال الداخلي:</label>
        <input 
          type="text" 
          [(ngModel)]="formData.internalSerial" 
          name="internalSerial"
          placeholder="مثال: RXM-3055"
          required
        />
      </div>

      <div>
        <label>الفرع:</label>
        <input 
          type="text" 
          [(ngModel)]="formData.branch" 
          name="branch"
          required
        />
      </div>

      <button type="submit">إضافة السيريال</button>
    </form>
  `
})
export class AddSerialComponent {
  formData = {
    productCode: '',
    internalSerial: '',
    branch: ''
  };

  constructor(private http: HttpClient) {}

  onSubmit() {
    this.http.post('/addSerial', this.formData).subscribe(
      (response: any) => {
        if (response.msg === 'success') {
          alert('تم إضافة السيريال بنجاح');
          this.formData = { productCode: '', internalSerial: '', branch: '' };
        }
      },
      (error) => {
        console.error('Error:', error);
        alert('حدث خطأ أثناء إضافة السيريال');
      }
    );
  }
}
```

---

## 2️⃣ صفحة عرض السيريالات (الداشبورد)

### التعديلات المطلوبة:

#### إضافة أعمدة جديدة في الجدول:
```html
- كود المنتج (productCode)
- السيريال الداخلي (internalSerial)
- الفرع (branch)
- حالة التفعيل (activated)
```

### مثال الكود:

#### React Component:
```jsx
import React, { useState, useEffect } from 'react';

function SerialsTable() {
  const [serials, setSerials] = useState([]);

  useEffect(() => {
    fetchSerials();
  }, []);

  const fetchSerials = async () => {
    try {
      const response = await fetch('/viewSerials');
      const data = await response.json();
      if (data.status === 'ok') {
        setSerials(data.serials);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <table>
      <thead>
        <tr>
          <th>كود المنتج (السيريال الخارجي)</th>
          <th>السيريال الداخلي</th>
          <th>الفرع</th>
          <th>حالة التفعيل</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        {serials.map((serial) => (
          <tr key={serial._id}>
            <td>{serial.productCode}</td>
            <td>{serial.internalSerial}</td>
            <td>{serial.branch}</td>
            <td>{serial.activated ? '✅ مفعل' : '❌ غير مفعل'}</td>
            <td>
              <button onClick={() => handleEdit(serial)}>تعديل</button>
              <button onClick={() => handleDelete(serial.productCode)}>حذف</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default SerialsTable;
```

---

## 3️⃣ صفحة تفعيل الضمان (للعميل) - التعديلات الكاملة

### التدفق الجديد:

#### الخطوة 1: إدخال السيريال الخارجي (من الكرتونة)
```jsx
function WarrantyActivation() {
  const [step, setStep] = useState(1); // 1: external serial, 2: internal serial, 3: form
  const [externalSerial, setExternalSerial] = useState('');
  const [internalSerial, setInternalSerial] = useState('');
  const [productInfo, setProductInfo] = useState(null);
  const [error, setError] = useState('');

  // الخطوة 1: التحقق من السيريال الخارجي
  const checkExternalSerial = async () => {
    try {
      const response = await fetch('/checkSerial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCode: externalSerial })
      });

      const data = await response.json();
      
      if (data.status === 'ok') {
        setProductInfo(data.productInfo); // تفاصيل المنتج
        setStep(2); // الانتقال للخطوة التالية
        setError('');
      } else if (data.status === 'act') {
        setError('هذا السيريال مفعل بالفعل');
      } else {
        setError('السيريال غير موجود');
      }
    } catch (error) {
      setError('حدث خطأ أثناء التحقق من السيريال');
    }
  };

  // الخطوة 2: التحقق من السيريال الداخلي
  const verifyInternalSerial = async () => {
    try {
      const response = await fetch('/verifyInternalSerial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCode: externalSerial,
          internalSerial: internalSerial
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStep(3); // الانتقال لصفحة التسجيل
        setError('');
      } else {
        setError('في حاجة غلط - السيريال الداخلي غير صحيح');
      }
    } catch (error) {
      setError('حدث خطأ أثناء التحقق من السيريال الداخلي');
    }
  };

  return (
    <div>
      {step === 1 && (
        <div>
          <h2>أدخل السيريال من الكرتونة</h2>
          <input
            type="text"
            value={externalSerial}
            onChange={(e) => setExternalSerial(e.target.value)}
            placeholder="مثال: M-102487"
          />
          <button onClick={checkExternalSerial}>تحقق</button>
          {error && <p style={{color: 'red'}}>{error}</p>}
        </div>
      )}

      {step === 2 && productInfo && (
        <div>
          <h2>تفاصيل المنتج</h2>
          <p>اسم المنتج: {productInfo.name}</p>
          <p>كود المنتج: {productInfo.code}</p>
          
          <h3>أدخل السيريال الداخلي للتفعيل</h3>
          <input
            type="text"
            value={internalSerial}
            onChange={(e) => setInternalSerial(e.target.value)}
            placeholder="مثال: RXM-3055"
          />
          <button onClick={verifyInternalSerial}>تحقق</button>
          {error && <p style={{color: 'red'}}>{error}</p>}
        </div>
      )}

      {step === 3 && (
        <ActivationForm 
          productCode={externalSerial}
          internalSerial={internalSerial}
        />
      )}
    </div>
  );
}
```

#### الخطوة 3: نموذج التفعيل (تسجيل البيانات ورفع الصورة)
```jsx
function ActivationForm({ productCode, internalSerial }) {
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    birthdate: '',
    address: '',
    brand: '',
    model: '',
    color: '',
    email: ''
  });
  const [image, setImage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key]);
    });
    formDataToSend.append('productCode', productCode);
    formDataToSend.append('internalSerial', internalSerial);
    formDataToSend.append('image', image);
    formDataToSend.append('createdAt', new Date().toISOString());

    try {
      const response = await fetch('/activation', {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();
      if (data.msg === 'success') {
        alert('تم تفعيل الضمان بنجاح');
        // Redirect or show success message
      }
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ أثناء التفعيل');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>تسجيل بيانات الضمان</h2>
      
      <input
        type="text"
        placeholder="الاسم"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        required
      />
      
      <input
        type="tel"
        placeholder="رقم الهاتف"
        value={formData.phoneNumber}
        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
        required
      />
      
      <input
        type="date"
        placeholder="تاريخ الميلاد"
        value={formData.birthdate}
        onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="العنوان"
        value={formData.address}
        onChange={(e) => setFormData({...formData, address: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="الماركة"
        value={formData.brand}
        onChange={(e) => setFormData({...formData, brand: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="الموديل"
        value={formData.model}
        onChange={(e) => setFormData({...formData, model: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="اللون"
        value={formData.color}
        onChange={(e) => setFormData({...formData, color: e.target.value})}
        required
      />
      
      <input
        type="email"
        placeholder="البريد الإلكتروني"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />
      
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0])}
        required
      />
      <label>صورة شهادة الضمان</label>
      
      <button type="submit">تفعيل الضمان</button>
    </form>
  );
}
```

---

## 4️⃣ صفحة تعديل السيريال (الداشبورد)

### التعديلات المطلوبة:

```jsx
function EditSerialModal({ serial, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    productCode: serial.productCode || '',
    internalSerial: serial.internalSerial || '',
    branch: serial.branch || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/updateSerial', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialId: serial._id,
          ...formData
        })
      });

      const data = await response.json();
      if (data.msg === 'success') {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="modal">
      <h2>تعديل السيريال</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={formData.productCode}
          onChange={(e) => setFormData({...formData, productCode: e.target.value})}
          placeholder="كود المنتج"
          required
        />
        
        <input
          type="text"
          value={formData.internalSerial}
          onChange={(e) => setFormData({...formData, internalSerial: e.target.value})}
          placeholder="السيريال الداخلي"
          required
        />
        
        <input
          type="text"
          value={formData.branch}
          onChange={(e) => setFormData({...formData, branch: e.target.value})}
          placeholder="الفرع"
          required
        />
        
        <button type="submit">حفظ التعديلات</button>
        <button type="button" onClick={onClose}>إلغاء</button>
      </form>
    </div>
  );
}
```

---

## 📝 ملخص التعديلات المطلوبة:

### الداشبورد:
1. ✅ تعديل نموذج إضافة السيريال (productCode, internalSerial)
2. ✅ تعديل جدول عرض السيريالات (إضافة الأعمدة الجديدة)
3. ✅ تعديل صفحة التعديل (الحقول الجديدة)

### صفحة العميل (تفعيل الضمان):
1. ✅ الخطوة 1: إدخال السيريال الخارجي (productCode)
2. ✅ الخطوة 2: عرض تفاصيل المنتج + إدخال السيريال الداخلي
3. ✅ الخطوة 3: التحقق من السيريال الداخلي
4. ✅ الخطوة 4: نموذج التسجيل + رفع صورة شهادة الضمان

---

## 🔗 Endpoints المطلوبة في Backend:

1. `POST /checkSerial` - التحقق من السيريال الخارجي (productCode)
2. `POST /verifyInternalSerial` - التحقق من السيريال الداخلي
3. `POST /addSerial` - إضافة سيريال جديد (productCode, internalSerial, branch)
4. `PUT /updateSerial` - تحديث السيريال
5. `POST /activation` - تفعيل الضمان (مع productCode و internalSerial)

---

## ⚠️ ملاحظات مهمة:

1. **التحقق من السيريال الخارجي**: يجب أن يبحث في `productCode`
2. **التحقق من السيريال الداخلي**: يجب أن يتحقق من التطابق بين `productCode` و `internalSerial`
3. **رسالة الخطأ**: "في حاجة غلط" عند إدخال سيريال داخلي خاطئ
4. **عرض تفاصيل المنتج**: بعد التحقق من السيريال الخارجي، عرض معلومات المنتج من جدول Products

---

## 🎨 تصميم UI/UX مقترح:

- استخدام خطوات واضحة (Stepper) في صفحة التفعيل
- رسائل خطأ واضحة باللغة العربية
- تحقق فوري من صحة البيانات
- عرض تفاصيل المنتج بشكل جذاب بعد التحقق من السيريال الخارجي
 -->
