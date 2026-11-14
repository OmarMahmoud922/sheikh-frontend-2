window.Platform = window.Platform || {};

(function () {
  var STORAGE_KEY = "elsherbiny_guest_schedule_v1";

  function todayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function addDays(dateStr, days) {
    var parts = String(dateStr).split("-");
    var d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + days));
    return d.toISOString().slice(0, 10);
  }

  function readState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { courses: {} };
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && parsed.courses ? parsed : { courses: {} };
    } catch (e) {
      return { courses: {} };
    }
  }

  function writeState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function sortSchedule(records) {
    return records.slice().sort(function (a, b) {
      return Number(a.sortOrder) - Number(b.sortOrder) || Number(a.lessonId) - Number(b.lessonId);
    });
  }

  function reconcileCourseEntry(entry, course, lessons, today) {
    var ordered = (lessons || []).slice().sort(function (a, b) {
      return Number(a.sortOrder) - Number(b.sortOrder) || Number(a.id) - Number(b.id);
    });
    var existingMap = {};
    ((entry && entry.schedule) || []).forEach(function (rec) {
      if (!existingMap[rec.lessonId]) {
        existingMap[rec.lessonId] = rec;
      }
    });

    var maxPending = null;
    ordered.forEach(function (l) {
      var rec = existingMap[l.id];
      if (rec && rec.status === "pending") {
        if (!maxPending || rec.scheduledDate > maxPending) {
          maxPending = rec.scheduledDate;
        }
      }
    });

    var nextDate = maxPending && maxPending >= today ? addDays(maxPending, 1) : today;
    var schedule = ordered.map(function (l) {
      var prev = existingMap[l.id];
      if (prev) {
        return {
          lessonId: Number(l.id),
          lessonTitle: l.title,
          sortOrder: Number(l.sortOrder),
          audioUrl: l.audioUrl || null,
          videoUrl: l.videoUrl || null,
          quizUrl: l.quizUrl || null,
          scheduledDate: prev.scheduledDate,
          status: prev.status,
          completedAt: prev.completedAt || null,
          postponedCount: Number(prev.postponedCount || 0)
        };
      }
      var item = {
        lessonId: Number(l.id),
        lessonTitle: l.title,
        sortOrder: Number(l.sortOrder),
        audioUrl: l.audioUrl || null,
        videoUrl: l.videoUrl || null,
        quizUrl: l.quizUrl || null,
        scheduledDate: nextDate,
        status: "pending",
        completedAt: null,
        postponedCount: 0
      };
      nextDate = addDays(nextDate, 1);
      return item;
    });

    return {
      courseId: Number(course.id),
      courseSlug: course.slug,
      courseTitle: course.title,
      enrolledAt: (entry && entry.enrolledAt) || new Date().toISOString(),
      schedule: sortSchedule(schedule)
    };
  }

  window.Platform.GuestSchedule = {
    isEnrolled: function (courseId) {
      var st = readState();
      return Boolean(st.courses[String(courseId)]);
    },

    getEnrolledCourseIds: function () {
      var st = readState();
      return Object.keys(st.courses).map(Number);
    },

    enrollCourse: function (course, lessons) {
      var st = readState();
      var key = String(course.id);
      st.courses[key] = reconcileCourseEntry(st.courses[key], course, lessons, todayStr());
      writeState(st);
      return st.courses[key];
    },

    syncSelectedCourses: function (selectedPairs) {
      var st = readState();
      var today = todayStr();
      var nextCourses = {};
      selectedPairs.forEach(function (pair) {
        var key = String(pair.course.id);
        nextCourses[key] = reconcileCourseEntry(st.courses[key], pair.course, pair.lessons, today);
      });
      st.courses = nextCourses;
      writeState(st);
    },

    removeCourse: function (courseId) {
      var st = readState();
      delete st.courses[String(courseId)];
      writeState(st);
    },

    getCompletedLessonIds: function (courseId) {
      var st = readState();
      var entry = st.courses[String(courseId)];
      if (!entry || !entry.schedule) return [];
      return entry.schedule
        .filter(function (r) {
          return r.status === "completed";
        })
        .map(function (r) {
          return Number(r.lessonId);
        });
    },

    completeLesson: function (courseId, lessonId) {
      var st = readState();
      var entry = st.courses[String(courseId)];
      if (!entry) throw new Error("الدورة غير موجودة في جدول المتابعة.");
      var sorted = sortSchedule(entry.schedule || []);
      var firstPending = sorted.find(function (r) {
        return r.status === "pending";
      });
      if (!firstPending) throw new Error("لا توجد دروس متبقية في هذه الدورة.");
      if (Number(firstPending.lessonId) !== Number(lessonId)) {
        throw new Error("لا يمكن تجاوز الدروس السابقة؛ يجب إتمام الدروس بالترتيب.");
      }

      var today = todayStr();
      var nowIso = new Date().toISOString();
      var pendingOffset = 0;
      entry.schedule = sorted.map(function (r) {
        if (Number(r.lessonId) === Number(lessonId)) {
          return Object.assign({}, r, { status: "completed", completedAt: nowIso });
        }
        if (r.status === "pending") {
          pendingOffset += 1;
          return Object.assign({}, r, { scheduledDate: addDays(today, pendingOffset) });
        }
        return r;
      });
      writeState(st);
    },

    postponeLesson: function (courseId, lessonId) {
      var st = readState();
      var entry = st.courses[String(courseId)];
      if (!entry) throw new Error("الدورة غير موجودة في جدول المتابعة.");
      var sorted = sortSchedule(entry.schedule || []);
      var firstPending = sorted.find(function (r) {
        return r.status === "pending";
      });
      if (!firstPending || Number(firstPending.lessonId) !== Number(lessonId)) {
        throw new Error("يمكنك تأجيل الدرس الحالي المجدول فقط.");
      }

      var today = todayStr();
      var base = firstPending.scheduledDate <= today ? addDays(today, 1) : addDays(firstPending.scheduledDate, 1);
      var pendingIdx = 0;
      entry.schedule = sorted.map(function (r) {
        if (r.status === "pending") {
          var updated = Object.assign({}, r, {
            scheduledDate: addDays(base, pendingIdx),
            postponedCount: Number(r.postponedCount || 0) + (pendingIdx === 0 ? 1 : 0)
          });
          pendingIdx += 1;
          return updated;
        }
        return r;
      });
      writeState(st);
    },

    buildDashboardView: function (freshCoursesMap) {
      var st = readState();
      var today = todayStr();
      var list = [];

      Object.keys(st.courses).forEach(function (cid) {
        var entry = st.courses[cid];
        if (freshCoursesMap && freshCoursesMap[cid]) {
          entry = reconcileCourseEntry(entry, freshCoursesMap[cid].course, freshCoursesMap[cid].lessons, today);
          st.courses[cid] = entry;
        }
        var sorted = sortSchedule(entry.schedule || []);
        var pending = sorted.filter(function (r) {
          return r.status === "pending";
        });
        var todayLesson = null;
        var nextScheduledLesson = null;
        var wasPostponedToday = false;

        if (pending.length > 0) {
          if (pending[0].scheduledDate <= today) {
            todayLesson = pending[0];
            nextScheduledLesson = pending[1] || null;
          } else {
            nextScheduledLesson = pending[0];
            wasPostponedToday = Number(pending[0].postponedCount || 0) > 0;
          }
        }

        var totalLessons = sorted.length;
        var completedLessons = sorted.filter(function (r) {
          return r.status === "completed";
        }).length;

        list.push({
          courseId: entry.courseId,
          courseSlug: entry.courseSlug,
          courseTitle: entry.courseTitle,
          totalLessons: totalLessons,
          completedLessons: completedLessons,
          remainingLessons: totalLessons - completedLessons,
          progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
          todayLesson: todayLesson,
          nextScheduledLesson: nextScheduledLesson,
          wasPostponedToday: wasPostponedToday,
          schedule: sorted
        });
      });

      writeState(st);

      var totalAll = list.reduce(function (a, b) { return a + b.totalLessons; }, 0);
      var doneAll = list.reduce(function (a, b) { return a + b.completedLessons; }, 0);
      return {
        today: today,
        summary: {
          enrolledCount: list.length,
          totalLessons: totalAll,
          completedLessons: doneAll,
          remainingLessons: totalAll - doneAll,
          overallProgressPercent: totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0
        },
        courses: list
      };
    }
  };
})();
