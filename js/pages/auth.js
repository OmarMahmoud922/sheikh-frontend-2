window.Platform = window.Platform || {};
window.Platform.Pages = window.Platform.Pages || {};

window.Platform.Pages.auth = function (root) {
  root.innerHTML =
    '<div class="container section page-enter" style="max-width:520px;">' +
    '<div class="card" style="padding:32px;text-align:center;">' +
    '<span class="badge badge-emerald" style="margin-bottom:12px;">تصفح ومتابعة كضيف</span>' +
    '<h1 style="font-size:1.55rem;color:var(--emerald-900);margin-bottom:10px;">لا حاجة لإنشاء حساب</h1>' +
    '<p style="color:var(--ink-muted);margin-bottom:22px;">' +
    "المنصة متاحة مجاناً للجميع كضيف؛ يمكنك تصفح كافة الدورات وإنشاء جدول متابعتك اليومي مباشرة على جهازك بدون تسجيل. تسجيل الدخول متاح لإدارة المنصة فقط." +
    "</p>" +
    '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">' +
    '<a href="#/dashboard" class="btn btn-primary">إنشاء / فتح جدول المتابعة</a>' +
    '<a href="#/" class="btn btn-outline">العودة للرئيسية</a>' +
    "</div></div></div>";
};
