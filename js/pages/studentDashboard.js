window.Platform = window.Platform || {};
window.Platform.Pages = window.Platform.Pages || {};

window.Platform.Pages.studentDashboard = async function (root) {
  var U = window.Platform.Utils;
  var I = window.Platform.Icons;
  var Api = window.Platform.Api;
  var GS = window.Platform.GuestSchedule;

  async function loadFreshCoursesMap() {
    var enrolledIds = GS.getEnrolledCourseIds();
    if (!enrolledIds.length) return {};
    try {
      var listRes = await Api.get("/api/courses");
      var map = {};
      var targets = (listRes.courses || []).filter(function (c) {
        return enrolledIds.indexOf(Number(c.id)) !== -1;
      });
      await Promise.all(
        targets.map(async function (c) {
          var detail = await Api.get("/api/courses/" + encodeURIComponent(c.slug));
          map[String(c.id)] = { course: detail.course, lessons: detail.lessons || [] };
        })
      );
      return map;
    } catch (e) {
      return {};
    }
  }

  var freshMap = await loadFreshCoursesMap();

  function renderDashboard() {
    var data = GS.buildDashboardView(freshMap);
    var sum = data.summary || {};

    var coursesHtml = (data.courses || [])
      .map(function (item) {
        var today = item.todayLesson;
        var next = item.nextScheduledLesson;

        var todayBlock = "";
        if (today) {
          var audioBtn = U.safeUrl(today.audioUrl)
            ? '<a class="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer" href="' +
              U.escapeHtml(U.safeUrl(today.audioUrl)) +
              '">' +
              I.audio +
              " استماع</a>"
            : "";
          var videoBtn = U.safeUrl(today.videoUrl)
            ? '<a class="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer" href="' +
              U.escapeHtml(U.safeUrl(today.videoUrl)) +
              '">' +
              I.video +
              " فيديو</a>"
            : "";

          todayBlock =
            '<div class="today-spotlight" style="background:var(--emerald-50);border-radius:14px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">' +
            '<span class="badge badge-emerald">استمع اليوم — الدرس رقم ' +
            today.sortOrder +
            "</span>" +
            '<span style="font-size:0.84rem;color:var(--ink-muted);">مجدول ليوم: ' +
            U.escapeHtml(U.formatArabicDate(today.scheduledDate)) +
            "</span></div>" +
            '<h3 style="font-size:1.18rem;color:var(--emerald-900);margin-bottom:12px;">' +
            '<a href="#/lesson/' +
            today.lessonId +
            '">' +
            U.escapeHtml(today.lessonTitle) +
            "</a></h3>" +
            '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
            '<a href="#/lesson/' +
            today.lessonId +
            '" class="btn btn-outline btn-sm">فتح الدرس والمرفقات</a>' +
            audioBtn +
            videoBtn +
            '<button type="button" class="btn btn-primary btn-sm" data-complete-cid="' +
            item.courseId +
            '" data-lesson-id="' +
            today.lessonId +
            '">' +
            I.check +
            " تم الاستماع</button>" +
            '<button type="button" class="btn btn-gold btn-sm" data-postpone-cid="' +
            item.courseId +
            '" data-lesson-id="' +
            today.lessonId +
            '">' +
            I.clock +
            " تأجيل للغد</button>" +
            "</div></div>";
        } else if (next) {
          todayBlock =
            '<div class="today-spotlight" style="background:var(--gold-100);border-right-color:var(--gold-600);border-radius:14px;">' +
            '<strong style="display:block;color:var(--gold-700);margin-bottom:4px;">' +
            (item.wasPostponedToday ? "تم تأجيل درس اليوم إلى الغد بنجاح" : "أحسنت! أتممت ورد اليوم") +
            "</strong>" +
            '<p style="margin:0;color:var(--ink-muted);">الدرس القادم في جدولك: <strong>' +
            U.escapeHtml(next.lessonTitle) +
            "</strong> — بتاريخ " +
            U.escapeHtml(U.formatArabicDate(next.scheduledDate)) +
            "</p></div>";
        } else {
          todayBlock =
            '<div class="today-spotlight" style="background:var(--success-bg);border-radius:14px;">' +
            '<strong style="color:var(--emerald-800);">أتممت جميع دروس هذه الدورة بحمد الله!</strong></div>';
        }

        var timelineRows = (item.schedule || [])
          .map(function (row) {
            var isDone = row.status === "completed";
            return (
              '<div class="lesson-list-row">' +
              '<div style="display:flex;align-items:center;gap:10px;">' +
              '<span class="badge ' +
              (isDone ? "badge-emerald" : "badge-neutral") +
              '">' +
              (isDone ? I.check + " مكتمل" : "الدرس " + row.sortOrder) +
              "</span>" +
              '<a href="#/lesson/' +
              row.lessonId +
              '" style="font-weight:600;">' +
              U.escapeHtml(row.lessonTitle) +
              "</a></div>" +
              '<span style="font-size:0.84rem;color:var(--ink-muted);">' +
              U.escapeHtml(U.formatArabicDate(row.scheduledDate)) +
              "</span></div>"
            );
          })
          .join("");

        return (
          '<section class="card" style="padding:24px;margin-bottom:24px;">' +
          '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;">' +
          '<div><h2 style="font-size:1.38rem;color:var(--emerald-900);margin-bottom:4px;">' +
          '<a href="#/course/' +
          encodeURIComponent(item.courseSlug) +
          '">' +
          U.escapeHtml(item.courseTitle) +
          "</a></h2>" +
          '<span style="font-size:0.9rem;color:var(--ink-muted);">أتممت ' +
          item.completedLessons +
          " من " +
          item.totalLessons +
          " دروس (" +
          item.progressPercent +
          "%)</span></div>" +
          '<div style="display:flex;gap:8px;align-items:center;">' +
          '<a href="#/course/' +
          encodeURIComponent(item.courseSlug) +
          '" class="btn btn-outline btn-sm">صفحة الدورة</a>' +
          '<button type="button" class="btn btn-danger btn-sm" data-unenroll-cid="' +
          item.courseId +
          '">حذف من الجدول</button>' +
          "</div></div>" +
          '<div class="progress-track" style="margin-bottom:18px;"><div class="progress-fill" style="width:' +
          item.progressPercent +
          '%;"></div></div>' +
          todayBlock +
          '<details style="margin-top:12px;">' +
          '<summary style="cursor:pointer;font-weight:700;color:var(--emerald-800);padding:6px 0;">عرض الخطة الكاملة لدروس الدورة (' +
          item.totalLessons +
          " دروس)</summary>" +
          '<div class="card" style="margin-top:10px;overflow:hidden;">' +
          timelineRows +
          "</div></details></section>"
        );
      })
      .join("");

    root.innerHTML =
      '<div class="container section page-enter">' +
      '<div class="section-header"><div>' +
      '<span class="badge badge-emerald" style="margin-bottom:8px;">وضع الضيف — محفوظ تلقائياً على جهازك</span>' +
      '<h1 class="section-title">جدول متابعة الدورات اليومي</h1>' +
      '<p class="section-subtitle">تابع دروسك بالترتيب اليومي دون الحاجة لإنشاء حساب.</p></div>' +
      '<a href="#/" class="btn btn-outline">تعديل الدورات المختارة</a></div>' +
      '<div class="stats-grid">' +
      '<div class="card stat-card"><span class="stat-val">' +
      Number(sum.enrolledCount || 0) +
      '</span><span class="stat-label">الدورات في جدولك</span></div>' +
      '<div class="card stat-card"><span class="stat-val">' +
      Number(sum.completedLessons || 0) +
      '</span><span class="stat-label">دروس أتممتها</span></div>' +
      '<div class="card stat-card"><span class="stat-val">' +
      Number(sum.remainingLessons || 0) +
      '</span><span class="stat-label">دروس متبقية</span></div>' +
      '<div class="card stat-card"><span class="stat-val">' +
      Number(sum.overallProgressPercent || 0) +
      '%</span><span class="stat-label">نسبة الإنجاز الكلية</span></div>' +
      "</div>" +
      (coursesHtml ||
        '<div class="card" style="padding:36px;text-align:center;">' +
          '<h2 style="color:var(--emerald-900);margin-bottom:8px;">جدولك اليومي فارغ حالياً</h2>' +
          '<p style="color:var(--ink-muted);margin-bottom:18px;">اختر الدورات التي تريد متابعتها من الرئيسية أو صفحة الدورات وسيتم إنشاء جدولك اليومي فوراً.</p>' +
          '<a href="#/" class="btn btn-gold">إنشاء جدول المتابعة الآن</a></div>') +
      "</div>";
  }

  root.onclick = function (e) {
    var compBtn = e.target.closest("button[data-complete-cid]");
    if (compBtn) {
      try {
        GS.completeLesson(
          Number(compBtn.getAttribute("data-complete-cid")),
          Number(compBtn.getAttribute("data-lesson-id"))
        );
        U.toast("بارك الله فيك! تم تسجيل إتمام الدرس وحفظ تقدمك.");
        renderDashboard();
      } catch (err) {
        U.toast(err.message, "error");
      }
      return;
    }

    var postBtn = e.target.closest("button[data-postpone-cid]");
    if (postBtn) {
      try {
        GS.postponeLesson(
          Number(postBtn.getAttribute("data-postpone-cid")),
          Number(postBtn.getAttribute("data-lesson-id"))
        );
        U.toast("تم تأجيل الدرس إلى الغد مع الحفاظ على الترتيب.");
        renderDashboard();
      } catch (err) {
        U.toast(err.message, "error");
      }
      return;
    }

    var unBtn = e.target.closest("button[data-unenroll-cid]");
    if (unBtn) {
      GS.removeCourse(Number(unBtn.getAttribute("data-unenroll-cid")));
      U.toast("تمت إزالة الدورة من جدولك.");
      renderDashboard();
    }
  };

  renderDashboard();
};
