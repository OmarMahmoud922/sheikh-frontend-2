window.Platform = window.Platform || {};
window.Platform.Pages = window.Platform.Pages || {};

window.Platform.Pages.home = async function (root, ctx) {
  var U = window.Platform.Utils;
  var I = window.Platform.Icons;
  var C = window.Platform.Components;
  var Api = window.Platform.Api;
  var GS = window.Platform.GuestSchedule;

  var data = ctx.bootstrap || (await Api.get("/api/bootstrap"));
  var allCoursesRes = await Api.get("/api/courses").catch(function () {
    return { courses: data.featuredCourses || [] };
  });
  var allCourses = allCoursesRes.courses || data.featuredCourses || [];
  var s = data.settings || {};

  // 1) الجزء الأول: الدرس القادم المباشر
  var upcomingBlock = data.upcomingAnnouncement
    ? C.renderAnnouncementCard(data.upcomingAnnouncement)
    : '<div class="announcement-card">' +
      '<div>' +
      '<span class="badge badge-gold" style="margin-bottom:10px;">' +
      I.calendar +
      " الدرس القادم المباشر</span>" +
      '<h1 style="font-size:1.65rem;color:var(--emerald-900);margin-bottom:8px;">' +
      U.escapeHtml(s.heroTitle || "منصة الشيخ إبراهيم الشربيني التعليمية") +
      "</h1>" +
      '<p style="color:var(--ink-muted);margin:0;">لا يوجد بث مباشر مجدول في هذه اللحظة — يمكنك تصفح الدورات المتاحة وإنشاء جدولك اليومي مباشرة كضيف.</p>' +
      "</div>" +
      '<div style="text-align:center;"><a href="#/courses" class="btn btn-primary">تصفح الدورات</a></div>' +
      "</div>";

  // 2) الجزء الثاني: الدورات العلمية
  var coursesHtml = (data.featuredCourses || []).map(C.renderCourseCard).join("");

  // 3) الجزء الثالث: إنشاء جدول متابعة الدورات (تصفح كضيف بدون حساب)
  var enrolledIds = new Set(GS.getEnrolledCourseIds());
  var checklistHtml = allCourses
    .map(function (c) {
      var checked = enrolledIds.has(Number(c.id)) ? " checked" : "";
      return (
        '<label class="card" style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;cursor:pointer;">' +
        '<input type="checkbox" class="schedule-course-checkbox" value="' +
        c.id +
        '" data-slug="' +
        U.escapeHtml(c.slug) +
        '"' +
        checked +
        ' style="margin-top:4px;width:18px;height:18px;accent-color:var(--emerald-700);" />' +
        '<span style="flex:1;">' +
        '<strong style="display:block;color:var(--emerald-900);">' +
        U.escapeHtml(c.title) +
        "</strong>" +
        '<span style="font-size:0.84rem;color:var(--ink-muted);">' +
        Number(c.lessonCount || 0) +
        " دروس • " +
        U.escapeHtml(U.statusLabel(c.status).text) +
        "</span></span></label>"
      );
    })
    .join("");

  var socialHtml = (data.socialLinks || [])
    .map(function (lnk) {
      var safe = U.safeUrl(lnk.url);
      if (!safe) return "";
      return (
        '<a class="card card-hover social-card" target="_blank" rel="noopener noreferrer" href="' +
        U.escapeHtml(safe) +
        '">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
        '<span class="social-icon-box">' +
        I.globe +
        "</span>" +
        '<div><strong style="display:block;color:var(--emerald-900);">' +
        U.escapeHtml(lnk.platformName) +
        '</strong><span style="font-size:0.82rem;color:var(--ink-muted);">اضغط للمتابعة</span></div>' +
        "</div>" +
        I.external +
        "</a>"
      );
    })
    .join("");

  root.innerHTML =
    '<div class="page-enter">' +
    // Section 1: Upcoming Lesson (Top of page immediately!)
    '<section class="section" style="padding-top:28px;padding-bottom:26px;">' +
    '<div class="container">' +
    '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;">' +
    '<span class="badge badge-emerald">' +
    U.escapeHtml(s.heroBadge || "منهجية علمية مؤصلة للتعلم المستمر") +
    "</span>" +
    '<span style="font-size:0.9rem;color:var(--ink-muted);font-weight:700;">' +
    (ctx.user && ctx.user.role === "admin"
      ? "مسجل كمشرف عام"
      : "التسجيل متاح كضيف — تصفح وتابع دروسك بدون حساب") +
    "</span></div>" +
    upcomingBlock +
    "</div></section>" +
    // Section 2: Courses
    '<section class="section" style="padding-top:24px;">' +
    '<div class="container">' +
    '<div class="section-header">' +
    '<div><h2 class="section-title">الدورات العلمية</h2>' +
    '<p class="section-subtitle">' +
    U.escapeHtml(s.heroSubtitle || "تصفح الدورات الشرعية واستمع للدروس أو أنشئ خطة متابعة يومية خاصة بك.") +
    "</p></div>" +
    '<a href="#/courses" class="btn btn-outline">عرض جميع الدورات</a>' +
    "</div>" +
    '<div class="courses-grid">' +
    (coursesHtml || '<div class="card" style="padding:28px;">لا توجد دورات منشورة حالياً.</div>') +
    "</div></div></section>" +
    // Section 3: Create Guest Study Schedule
    '<section class="section section-alt" id="create-schedule-section">' +
    '<div class="container">' +
    '<div class="card" style="padding:28px;border-right:5px solid var(--emerald-700);">' +
    '<div class="section-header" style="margin-bottom:18px;">' +
    '<div><h2 class="section-title">إنشاء جدول متابعة الدورات</h2>' +
    '<p class="section-subtitle">اختر الدورات التي ترغب في الالتزام بها ليُرتّب لك الموقع درساً واحداً يومياً تلقائياً كضيف على جهازك بدون إنشاء حساب.</p></div>' +
    (enrolledIds.size > 0
      ? '<a href="#/dashboard" class="btn btn-outline">عرض جدولي الحالي (' + enrolledIds.size + ")</a>"
      : "") +
    "</div>" +
    '<form id="guest-schedule-builder-form">' +
    '<div class="courses-grid" style="grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-bottom:20px;">' +
    (checklistHtml || '<p style="color:var(--ink-muted);">لا توجد دورات متاحة للاختيار حالياً.</p>') +
    "</div>" +
    '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">' +
    '<button type="submit" class="btn btn-primary">' +
    I.check +
    " إنشاء / حفظ جدول المتابعة اليومي</button>" +
    '<span style="font-size:0.86rem;color:var(--ink-muted);">يتم حفظ الجدول وتقدمك تلقائياً على هذا المتصفح بدون تسجيل حساب.</span>' +
    "</div></form></div></div></section>" +
    // Section 4: Social Links
    (socialHtml
      ? '<section class="section"><div class="container">' +
        '<div class="section-header"><div><h2 class="section-title">حسابات ومنصات التواصل</h2>' +
        '<p class="section-subtitle">تابع الدروس والبثوث المباشرة عبر القنوات الرسمية.</p></div></div>' +
        '<div class="social-grid">' +
        socialHtml +
        "</div></div></section>"
      : "") +
    "</div>";

  var builderForm = document.getElementById("guest-schedule-builder-form");
  if (builderForm) {
    builderForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var checkedBoxes = Array.from(
        builderForm.querySelectorAll("input.schedule-course-checkbox:checked")
      );
      if (!checkedBoxes.length) {
        U.toast("اختر دورة واحدة على الأقل لإنشاء جدول المتابعة.", "error");
        return;
      }
      var btn = builderForm.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        var pairs = await Promise.all(
          checkedBoxes.map(async function (box) {
            var slug = box.getAttribute("data-slug");
            var detail = await Api.get("/api/courses/" + encodeURIComponent(slug));
            return { course: detail.course, lessons: detail.lessons || [] };
          })
        );
        GS.syncSelectedCourses(pairs);
        U.toast("تم إنشاء جدول متابعة الدورات بنجاح!");
        window.location.hash = "#/dashboard";
      } catch (err) {
        U.toast(err.message || "تعذر إنشاء الجدول، حاول مرة أخرى.", "error");
        btn.disabled = false;
      }
    });
  }

  return C.bindCountdowns(root);
};
