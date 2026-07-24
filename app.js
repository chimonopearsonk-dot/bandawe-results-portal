import { db, auth } from "./firebase-config.js";
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// All JavaScript functions go here (login, manageStudents, exportAllClassesResults, etc.)
window.db = db;
window.auth = auth;

// ================= CONSTANTS =================
const subjects = [
    "Agriculture", "Bible Knowledge", "Chichewa", "English", 
    "Expressive Arts", "Mathematics", "Life Skills", 
    "Science & Tech", "Social Studies"
];

const classes = [
    "Standard 1", "Standard 2", "Standard 3", "Standard 4",
    "Standard 5", "Standard 6", "Standard 7", "Standard 8"
];
   // ================= GALLERY DATA & FUNCTIONS =================
let galleryImages = [
    { id: 1, url: "school-campus.jpg", category: "campus", caption: "Main School Campus" },
    { id: 2, url: "https://via.placeholder.com/800x600/003366/ffffff?text=Classroom", category: "academic", caption: "Interactive Learning Session" },
    { id: 3, url: "https://via.placeholder.com/800x600/667eea/ffffff?text=Tailoring", category: "vocational", caption: "Tailoring Vocational Training" },
    { id: 4, url: "https://via.placeholder.com/800x600/f7971e/ffffff?text=Graduation", category: "events", caption: "Graduation Ceremony" },
    { id: 5, url: "https://via.placeholder.com/800x600/11998e/ffffff?text=Sports", category: "sports", caption: "Sports Day" }
];

let currentImageIndex = 0;

window.showGalleryPage = function() {
    console.log("showGalleryPage called");
    // Hide others
    document.getElementById("public").classList.add("hidden");
    document.getElementById("aboutPage").classList.add("hidden");
    document.getElementById("noticesPage").classList.add("hidden");
    document.getElementById("calendarPage").classList.add("hidden");
    document.getElementById("galleryPage").classList.remove("hidden");
    
    renderGallery('all');
};

function renderGallery(filter = 'all') {
    const container = document.getElementById("galleryContainer");
    if (!container) return console.error("Gallery container missing");
    
    container.innerHTML = "";
    
    const filtered = filter === 'all' ? galleryImages : galleryImages.filter(img => img.category === filter);
    
    filtered.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = "gallery-item";
        div.innerHTML = `
            <img src="${img.url}" alt="${img.caption}" style="width:100%; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.15);">
            <p style="text-align:center; margin-top:10px; color:#333;">${img.caption}</p>
        `;
        div.onclick = () => window.openLightbox(index);
        container.appendChild(div);
    });
}

window.filterGallery = function(filter) {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${filter}'`));
    });
    renderGallery(filter);
};

window.openLightbox = function(index) {
    currentImageIndex = index;
    document.getElementById("lightbox").style.display = "flex";
    document.getElementById("lightboxImage").src = galleryImages[index].url;
};

window.closeLightbox = function() {
    document.getElementById("lightbox").style.display = "none";
};

window.nextImage = function() {
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    document.getElementById("lightboxImage").src = galleryImages[currentImageIndex].url;
};

window.prevImage = function() {
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    document.getElementById("lightboxImage").src = galleryImages[currentImageIndex].url;
};

// ================= HELPER FUNCTIONS =================
function getGradeAndRemark(score) {
    if (score >= 80) return { grade: 4, remark: "Excellent" };
    if (score >= 60) return { grade: 3, remark: "Good" };
    if (score >= 40) return { grade: 2, remark: "Average" };
    return { grade: 1, remark: "Need Support" };
}

function getOverallRemark(total, maxTotal) {
    const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
    if (percentage >= 80) return "Outstanding performance! Keep it up.";
    if (percentage >= 70) return "Very good work. Continue improving.";
    if (percentage >= 60) return "Good performance. Aim higher next term.";
    if (percentage >= 40) return "Satisfactory. More effort needed in weak areas.";
    return "Needs significant improvement. Extra support recommended.";
}

// Create a student registration Excel template
function downloadStudentTemplate() {
    const wb = XLSX.utils.book_new();
    const data = [
        ["StudentName", "Gender", "DOB"],
        ["John Banda", "Male", "01/01/2010"],
        ["Mary Phiri", "Female", "15/06/2011"],
        // Add more students
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Registration_Template.xlsx");
}

// ================= AUTHENTICATION =================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.email));
            if (userDoc.exists()) {
                window.currentUser = userDoc.data();
                window.currentUser.email = user.email;
            } else {
                window.currentUser = { role: "admin", fullName: "Administrator", email: user.email };
            }
        } catch (e) {
            window.currentUser = { role: "admin", fullName: "Administrator", email: user.email };
        }
        
        console.log("✅ Logged in as:", window.currentUser.fullName, "Role:", window.currentUser.role);
        
        document.getElementById("public").classList.add("hidden");
        document.getElementById("searchPortal").classList.add("hidden");
        document.getElementById("results").classList.add("hidden");
        document.getElementById("adminLogin").classList.add("hidden");
        document.getElementById("adminPanel").classList.remove("hidden");
        document.getElementById("adminArea").innerHTML = "";
        
        window.updateAdminUI();
        window.loadRoleBasedDashboard();
    } else {
        console.log("👤 User logged out");
        document.getElementById("public").classList.remove("hidden");
        document.getElementById("adminPanel").classList.add("hidden");
        document.getElementById("adminLogin").classList.add("hidden");
        document.getElementById("searchPortal").classList.add("hidden");
        document.getElementById("results").classList.add("hidden");
        window.currentUser = null;
    }
});

// ================= DASHBOARD FUNCTIONS =================
window.loadRoleBasedDashboard = function() {
    const user = window.currentUser;
    if (!user) return;
    
    const dashboardMenu = document.getElementById("dashboardMenu");
    if (!dashboardMenu) return;
    
    if (user.role === "admin") {
        dashboardMenu.innerHTML = `
            <div class="admin-grid">
                <div class="admin-card" onclick="manageStudents()">
                    <i class="fa-solid fa-user-graduate"></i>
                    <h3>Students</h3>
                    <p>Add, edit and manage learners</p>
                </div>
                <div class="admin-card" onclick="enterResults()">
                    <i class="fa-solid fa-pen-to-square"></i>
                    <h3>Enter Results</h3>
                    <p>Enter learner results</p>
                </div>
                <div class="admin-card" onclick="showBulkUpload()">
                    <i class="fa-solid fa-file-excel"></i>
                    <h3>Bulk Upload</h3>
                    <p>Upload class results</p>
                </div>
                <div class="admin-card" onclick="showClassDashboard()">
                    <i class="fa-solid fa-chart-line"></i>
                    <h3>Performance</h3>
                    <p>Class analysis</p>
                </div>
                <div class="admin-card" onclick="manageNotices()">
                    <i class="fa-solid fa-bullhorn"></i>
                    <h3>Notices</h3>
                    <p>Announcements</p> 
                </div>
                <div class="admin-card" onclick="manageCalendar()">
                    <i class="fa-solid fa-calendar-days"></i>
                    <h3>Calendar</h3>
                    <p>Opening dates</p>
                </div>
                <div class="admin-card" onclick="manageGallery()">
                    <i class="fa-solid fa-images"></i>
                    <h3>Gallery</h3>
                    <p>Manage school photos</p>
                </div>
                <div class="admin-card" onclick="manageUsers()">
                    <i class="fa-solid fa-users"></i>
                    <h3>Users</h3>
                    <p>Manage teachers</p>
                </div>
                <div class="admin-card" onclick="logout()">
                    <i class="fa-solid fa-right-from-bracket"></i>
                    <h3>Logout</h3>
                    <p>Exit system</p>
                </div>
            </div>
        `;
    } 
    else if (user.role === "teacher") {
        // Teacher version (keep as before or simplify)
        dashboardMenu.innerHTML = `
            <div style="background:#e8f0fe; padding:15px; border-radius:10px; margin-bottom:20px;">
                <h3 style="margin:0; color:#003366;"><i class="fa-solid fa-chalkboard-user"></i> Welcome, ${user.fullName}</h3>
            </div>
            <div class="admin-grid">
                <div class="admin-card" onclick="viewAllStudents()"><i class="fa-solid fa-users"></i><h3>My Students</h3></div>
                <div class="admin-card" onclick="enterResults()"><i class="fa-solid fa-pen-to-square"></i><h3>Enter Results</h3></div>
                <div class="admin-card" onclick="showBulkUpload()"><i class="fa-solid fa-file-excel"></i><h3>Bulk Upload</h3></div>
                <div class="admin-card" onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i><h3>Logout</h3></div>
            </div>
        `;
    }
    
    console.log("✅ Admin dashboard loaded with all buttons");
};
window.updateAdminHeader = function() {
    const user = window.currentUser;
    if (!user) return;
    const header = document.getElementById("adminHeader");
    if (!header) return;
    
    const roleDisplay = user.role === "admin" ? "Administrator" : "Teacher";
    const roleIcon = user.role === "admin" ? "fa-user-tie" : "fa-chalkboard-user";
    const roleColor = user.role === "admin" ? "#003366" : "#28a745";
    
    header.innerHTML = `
        <div style="background:white; padding:20px; border-radius:15px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                    <h2 style="margin:0; color:#003366;"><i class="fa-solid ${roleIcon}"></i> Dashboard</h2>
                    <p style="margin:5px 0 0; color:#666;">
                        Welcome back, <strong>${user.fullName}</strong> 
                        <span style="background:${roleColor}; color:white; padding:2px 12px; border-radius:12px; font-size:12px; margin-left:10px;">${roleDisplay}</span>
                        ${user.class ? `<span style="background:#e8f0fe; padding:2px 12px; border-radius:12px; font-size:12px; margin-left:5px;">${user.class}</span>` : ''}
                    </p>
                </div>
                <div>
                    <button onclick="logout()" style="background:#dc3545; color:white; padding:10px 20px; border:none; border-radius:8px; cursor:pointer;">
                        <i class="fa-solid fa-right-from-bracket"></i> Logout
                    </button>
                </div>
            </div>
        </div>
    `;
};

window.updateAdminUI = function() {
    const user = window.currentUser;
    if (!user) return;
    console.log(`Logged in as ${user.role} - ${user.fullName || user.email}`);
    window.updateAdminHeader();
    window.loadRoleBasedDashboard();
};

// ================= LOGIN / LOGOUT =================
window.login = async function() {
    const email = document.getElementById("user").value.trim();
    const password = document.getElementById("pass").value.trim();
    if (!email || !password) return alert("Please enter email and password!");
    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Login successful! Welcome.");
    } catch (e) {
        alert("Login failed: " + e.message);
    }
};

window.logout = async function() {
    try {
        await signOut(auth);
        alert("Logged out successfully");
        window.backToSearch();
    } catch (e) {
        alert("Logout error: " + e.message);
    }
};

// ================= PUBLIC FUNCTIONS =================
window.showSearchPortal = function() {
    console.log("showSearchPortal called");
    document.getElementById("public").classList.add("hidden");
    document.getElementById("searchPortal").classList.remove("hidden");
    document.getElementById("results").classList.add("hidden");
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminLogin").classList.add("hidden");
};

window.showNoticesPage = async function(){
    document.getElementById("public").classList.add("hidden");
    document.getElementById("noticesPage").classList.remove("hidden");
    const box = document.getElementById("publicNotices");
    box.innerHTML = "Loading notices...";
    try {
        const snap = await getDocs(collection(db,"announcements"));
        let html="";
        snap.forEach(docSnap=>{
            const d = docSnap.data();
            if(d.active !== false){
                html += `<div class="notice-item"><strong>${d.title || "Announcement"}</strong><br>${d.message || ""}</div>`;
            }
        });
        box.innerHTML = html || "No announcements available";
    } catch(error){
        console.error(error);
        box.innerHTML = "Failed loading announcement.";
    }
};

window.showCalendarPage = async function(){
    document.getElementById("public").classList.add("hidden");
    document.getElementById("calendarPage").classList.remove("hidden");
    const box = document.getElementById("publicCalendar");
    box.innerHTML="Loading calendar...";
    const snapshot = await getDocs(collection(db,"calendar"));
    let html="";
    snapshot.forEach(docSnap=>{
        const d=docSnap.data();
        if(d.active){
            html += `<div class="calendar-item"><span class="calendar-date">${d.date}</span><br>${d.activity}</div>`;
        }
    });
    box.innerHTML = html || "No academic calendar available.";
};

window.showAboutPage = function() {
    console.log("showAboutPage called");
    
    // Hide all main sections
    document.getElementById("public").classList.add("hidden");
    document.getElementById("searchPortal").classList.add("hidden");
    document.getElementById("results").classList.add("hidden");
    document.getElementById("adminLogin").classList.add("hidden");
    document.getElementById("adminPanel").classList.add("hidden");
    
    // Show About
    const about = document.getElementById("aboutPage");
    about.classList.remove("hidden");
};

window.backToPublicDashboard = function(){
    document.getElementById("noticesPage").classList.add("hidden");
    document.getElementById("calendarPage").classList.add("hidden");
    document.getElementById("aboutPage").classList.add("hidden");
    document.getElementById("galleryPage").classList.add("hidden");   // ← Added
    document.getElementById("public").classList.remove("hidden");
};

window.showAdmin = function() {
    console.log("showAdmin called");
    document.getElementById("public").classList.add("hidden");
    document.getElementById("adminLogin").classList.remove("hidden");
    document.getElementById("results").classList.add("hidden");
    document.getElementById("searchPortal").classList.add("hidden");
};

window.backToSearch = function() {
    console.log("backToSearch called");
    document.getElementById("results").classList.add("hidden");
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminLogin").classList.add("hidden");
    document.getElementById("searchPortal").classList.add("hidden");
    document.getElementById("public").classList.remove("hidden");
    document.getElementById("adminArea").innerHTML = "";
};

window.backToAdminResults = function() {
    console.log("backToAdminResults called");
    document.getElementById("results").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    const menu = document.getElementById("dashboardMenu");
    if(menu) menu.style.display = "flex";
    document.getElementById("adminArea").innerHTML = "";
};
// ================= IMPROVED ADMIN NAVIGATION =================
window.openAdminPage = function() {
    // Hide all non-admin sections
    const toHide = ["public", "searchPortal", "results", "adminLogin", "aboutPage", 
                   "noticesPage", "calendarPage", "galleryPage"];
    toHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });

    document.getElementById("adminPanel").classList.remove("hidden");
    
    // Clear main admin area
    const area = document.getElementById("adminArea");
    if (area) {
        area.innerHTML = "";
        area.style.display = "block";
    }
};

window.backToDashboard = function(){
    console.log("backToDashboard called");
    
    // Hide all dedicated admin sub-pages
    const pages = ["adminStudentPage", "adminCalendarPage", "adminNoticesPage", 
                   "adminViewStudentsPage", "adminEnterResultsPage", "adminBulkUploadPage",
                   "adminPerformancePage", "adminUsersPage", "adminGalleryPage", "results"];
    
    pages.forEach(pageId => {
        const el = document.getElementById(pageId);
        if (el) el.classList.add("hidden");
    });

    // Show main admin dashboard
    document.getElementById("adminPanel").classList.remove("hidden");
    
    const menu = document.getElementById("dashboardMenu");
    if (menu) menu.style.display = "block";
    
    const area = document.getElementById("adminArea");
    if (area) area.innerHTML = "";
};
        
// ================= MANAGE STUDENTS =================
window.manageStudents = function(){
    console.log("manageStudents called");
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminViewStudentsPage").classList.add("hidden");
    document.getElementById("adminStudentPage").classList.remove("hidden");
    document.getElementById("adminStudentContent").innerHTML = `
        <h2><i class="fa-solid fa-users"></i> Manage Students</h2>
        <button onclick="addStudent()"><i class="fa-solid fa-user-plus"></i> Add Student</button>
        <button onclick="viewAllStudents()"><i class="fa-solid fa-list"></i> View All Students</button>
    `;
};

window.addStudent = function() {
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminViewStudentsPage").classList.add("hidden");
    document.getElementById("adminStudentPage").classList.remove("hidden");
    let classOptions = classes.map(cls => `<option value="${cls}">${cls}</option>`).join('');
    document.getElementById("adminStudentContent").innerHTML = `
        <h3>Add New Student</h3>
        <input id="sname" placeholder="Full Name">
        <select id="sclass"><option value="">—— Select Class ——</option>${classOptions}</select>
        <input id="sdob" placeholder="DOB dd/mm/yyyy">
        <select id="sgender"><option value="">—— Select Gender ——</option><option value="Male">Male</option><option value="Female">Female</option></select>
        <button onclick="saveStudent()">Save Student</button>
    `;
};

window.saveStudent = async function() {
    const sname = document.getElementById("sname").value.trim();
    const sclass = document.getElementById("sclass").value;
    const sdob = document.getElementById("sdob").value.trim();
    const sgender = document.getElementById("sgender").value;
    if (!sname || !sclass || !sdob || !sgender) return alert("All fields are required!");
    try {
        await setDoc(doc(db, "students", sname), { class: sclass, dob: sdob, gender: sgender });
        alert("Student saved successfully!");
        window.manageStudents();
    } catch (e) { alert("Error: " + e.message); }
};

// ================= ENTER RESULTS =================
window.enterResults = function() {
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminEnterResultsPage").classList.remove("hidden");
    
    const user = window.currentUser;
    let classOptions = user && user.role === "teacher" ? 
        `<option value="${user.class}" selected>${user.class}</option>` : 
        classes.map(cls => `<option value="${cls}">${cls}</option>`).join('');
    
    let html = `
        <button onclick="backToDashboard()" style="margin-bottom:15px;">← Back to Dashboard</button>
        <h3>Enter Results</h3>
        <div style="background:#e8f0fe; padding:12px; border-radius:8px; margin-bottom:15px; font-size:13px; color:#555;">
            <i class="fa-solid fa-info-circle" style="color:#003366;"></i>
            <strong>Note:</strong> Only enter scores for subjects the student took.
        </div>
        <input id="rstudent" placeholder="Student Name">
        <select id="rclass"><option value="">—— Select Class ——</option>${classOptions}</select>
        <input id="classSize" type="number" placeholder="Number of Learners in Class" min="1">
        <select id="term"><option value="">—— Select Term ——</option><option value="Term 1">Term 1</option><option value="Term 2">Term 2</option><option value="Term 3" selected>Term 3</option></select>
        <input id="year" type="number" value="2026" placeholder="Year">
        <div style="margin:15px 0; padding:15px; background:#f8f9ff; border-radius:10px;">
            <p style="margin:0 0 10px; font-weight:bold; color:#003366;"><i class="fa-solid fa-pencil"></i> Subject Scores</p>`;
    
    subjects.forEach(sub => {
        html += `<div style="margin:8px 0; display:flex; align-items:center; gap:10px;">
            <label style="min-width:120px; font-weight:500;"><strong>${sub}:</strong></label>
            <input class="score" data-subject="${sub}" type="number" min="0" max="100" style="flex:1; padding:8px;">
        </div>`;
    });
    
    html += `</div><button onclick="saveResults()" style="background:#28a745; padding:12px 25px;"><i class="fa-solid fa-save"></i> Save Results</button>`;
    
    document.getElementById("adminEnterResultsContent").innerHTML = html;
};

window.saveResults = async function() {
    const rstudent = document.getElementById("rstudent").value.trim();
    const rclass = document.getElementById("rclass").value;
    const classSize = parseInt(document.getElementById("classSize").value);
    const term = document.getElementById("term").value;
    const year = document.getElementById("year").value;
    if (!rstudent || !rclass || !classSize || !term || !year) return alert("All fields are required!");
    let scores = {};
    let total = 0;
    let subjectCount = 0;
    document.querySelectorAll(".score").forEach(i => {
        const val = parseInt(i.value) || 0;
        const subject = i.dataset.subject;
        scores[subject] = val;
        if (val > 0) { total += val; subjectCount++; }
    });
    if (subjectCount === 0) return alert("Please enter at least one subject score!");
    try {
        const resultId = `${rstudent}_${term}_${year}`;
        const existing = await getDoc(doc(db, "results", resultId));
        if (existing.exists()) {
            const overwrite = confirm(`${rstudent} already has results for ${term} ${year}.\nOverwrite?`);
            if (!overwrite) return;
        }
        await setDoc(doc(db, "results", resultId), {
            scores: scores, total: total, class: rclass, classSize: classSize, term: term, year: year, subjectCount: subjectCount
        });
        alert(`Results saved successfully! (${subjectCount} subjects entered)`);
        window.backToDashboard();
    } catch (e) { alert("Error: " + e.message); }
};

// ================= SEARCH & RESULTS =================
window.search = async function() {
    try {
        const inputName = document.getElementById("name").value.trim();
        const inputDob = document.getElementById("dob").value.trim();
        if (!inputName || !inputDob) return alert("Enter Name and DOB");
        const snapshot = await getDocs(collection(db, "students"));
        let found = null;
        snapshot.forEach(docSnap => {
            if (docSnap.id.trim().toLowerCase() === inputName.toLowerCase() && docSnap.data().dob.trim() === inputDob) {
                found = docSnap.id;
            }
        });
        if (!found) return alert("Student not found");
        const inputTerm = document.getElementById("searchTerm").value;
        const inputYear = document.getElementById("searchYear").value;
        const resultDocId = `${found}_${inputTerm}_${inputYear}`;
        const resultSnap = await getDoc(doc(db, "results", resultDocId));
        if (!resultSnap.exists()) return alert("Results not found for selected term/year");
        document.getElementById("searchPortal").classList.add("hidden");
        document.getElementById("results").classList.remove("hidden");
        window.loadResults(found, resultSnap.data());
    } catch (e) { alert("Error: " + e.message); }
};

window.loadResults = function(name, data) {
    console.log("Loading results for:", name, data);
    const backBtn = document.getElementById("resultBackBtn");
    if (backBtn) {
        if (window.currentUser) { backBtn.onclick = window.backToAdminResults; } 
        else { backBtn.onclick = window.backToSearch; }
    }
    document.getElementById("reportTitle").innerText = `${data.term} ${data.year} Report Card`;
    document.getElementById("rname").innerText = name || "Unknown Student";
    document.getElementById("studentClass").innerHTML = `<strong>Class:</strong> ${data.class || "-"}`;
    
    const scores = data.scores || {};
    let total = 0;
    let subjectsWithScores = [];
    subjects.forEach(sub => {
        const score = Number(scores[sub]) || 0;
        if (score > 0) { subjectsWithScores.push(sub); total += score; }
    });
    if (subjectsWithScores.length === 0) { subjectsWithScores = subjects; total = Number(data.total) || 0; }
    const subjectCount = subjectsWithScores.length;
    const maxTotal = subjectCount * 100;
    const percentage = subjectCount > 0 ? ((total / maxTotal) * 100) : 0;
    const passed = percentage >= 40;
    let gradeNumber = 1;
    if (percentage >= 80) gradeNumber = 4;
    else if (percentage >= 60) gradeNumber = 3;
    else if (percentage >= 40) gradeNumber = 2;
    else gradeNumber = 1;
    
    document.getElementById("total").innerText = `${total} / ${maxTotal}`;
    document.getElementById("overallGrade").innerHTML = `<span style="font-size:24px;">${gradeNumber}</span>`;
    document.getElementById("resultStatus").innerHTML = passed
        ? '<span style="background:#28a745; color:white; padding:2px 15px; border-radius:15px; font-size:14px;">PASSED</span>'
        : '<span style="background:#dc3545; color:white; padding:2px 15px; border-radius:15px; font-size:14px;">FAILED</span>';
    
    getDocs(collection(db, "results")).then(snapshot => {
        let classResults = [];
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            if (d.class === data.class && d.term === data.term && String(d.year) == String(data.year)) {
                const studentScores = d.scores || {};
                let studentTotal = 0;
                let studentSubjectCount = 0;
                subjects.forEach(sub => {
                    const score = Number(studentScores[sub]) || 0;
                    if (score > 0) { studentSubjectCount++; studentTotal += score; }
                });
                if (studentSubjectCount === 0) { studentTotal = Number(d.total) || 0; }
                classResults.push({ name: docSnap.id, total: studentTotal });
            }
        });
        classResults.sort((a, b) => b.total - a.total);
        const position = classResults.findIndex(student => student.name.startsWith(name)) + 1;
        document.getElementById("position").innerText = `${position} / ${classResults.length}`;
    });
    
    let tableHtml = '';
    let hasAnyScores = false;
    subjectsWithScores.forEach(sub => {
        const score = Number(data.scores?.[sub]) || 0;
        if (score > 0) {
            hasAnyScores = true;
            const gr = getGradeAndRemark(score);
            tableHtml += `<tr><td style="padding:4px 6px; font-weight:600;">${sub}</td><td style="padding:4px 6px; text-align:center; font-weight:500;">${score}</td><td style="padding:4px 6px; text-align:center;">${gr.grade}</td><td style="padding:4px 6px; font-size:10px;">${gr.remark}</td><td style="padding:4px 6px; text-align:center; font-size:10px; color:#999;">__________</td></tr>`;
        }
    });
    if (!hasAnyScores) {
        tableHtml = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">No subject scores entered for this student.</td></tr>`;
    }
    const tbody = document.getElementById("resultsTableBody");
    if (tbody) tbody.innerHTML = tableHtml;
    else console.error("resultsTableBody not found!");
    
    document.getElementById("remark").innerHTML = getOverallRemark(total, maxTotal);
    let headteacherRemark = "";
    if (percentage >= 80) headteacherRemark = "Excellent performance! You have excelled this term. Keep up this outstanding work.";
    else if (percentage >= 70) headteacherRemark = "Very good results. Continue with this positive attitude and you will achieve even more.";
    else if (percentage >= 60) headteacherRemark = "Good performance. With more focus on weak areas, you can do even better next term.";
    else if (percentage >= 40) headteacherRemark = "Satisfactory performance. More consistent effort and extra practice is recommended.";
    else headteacherRemark = "Needs significant improvement. Please seek extra support and work harder next term.";
    document.getElementById("headRemark").innerHTML = headteacherRemark;
    
    window.getNextTermDate();
    window.getBoardingFee();
};

// ================= DYNAMIC DATA =================
window.getNextTermDate = async function() {
    try {
        const snapshot = await getDocs(collection(db, "calendar"));
        let nextTermDate = "14 September 2026";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const activity = data.activity?.toLowerCase() || "";
            if (activity.includes("term") || activity.includes("opening") || activity.includes("reopen")) {
                if (data.date) nextTermDate = data.date;
            }
        });
        document.getElementById("nextTermDate").innerText = nextTermDate;
    } catch (e) {
        console.error("Error fetching next term date:", e);
        document.getElementById("nextTermDate").innerText = "14 September 2026";
    }
};

window.getBoardingFee = async function() {
    try {
        const snapshot = await getDocs(collection(db, "announcements"));
        let boardingFee = "MWK 45,000";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const title = data.title?.toLowerCase() || "";
            const message = data.message?.toLowerCase() || "";
            if (title.includes("fee") || title.includes("boarding") || message.includes("fee") || message.includes("boarding")) {
                const feeMatch = message.match(/([\d,]+)/);
                if (feeMatch) { boardingFee = `MWK ${feeMatch[1]}`; } 
                else if (data.message) { boardingFee = data.message.substring(0, 50); }
            }
        });
        document.getElementById("boardingFee").innerText = boardingFee;
    } catch (e) {
        console.error("Error fetching boarding fee:", e);
        document.getElementById("boardingFee").innerText = "MWK 45,000";
    }
};

// ================= DOWNLOAD PDF =================
window.downloadPDF = function() {
    const element = document.getElementById("reportCard");
    document.body.classList.add("pdf-mode");
    const studentName = document.getElementById("rname").innerText.replace(/\s+/g, '_');
    const opt = {
        margin: [0.3, 0.2, 0.3, 0.2],
        filename: `${studentName}_Report_Card.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0, width: 800 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css'] }
    };
    html2pdf().set(opt).from(element).save().then(() => { document.body.classList.remove("pdf-mode"); });
};

// ================= PRINT =================
window.printReport = function() { window.print(); };

// ================= VIEW ALL STUDENTS =================
window.viewAllStudents = async function() {
    console.log("viewAllStudents called");
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminStudentPage").classList.add("hidden");
    document.getElementById("adminViewStudentsPage").classList.remove("hidden");
    const contentArea = document.getElementById("adminViewStudentsContent");
    if (!contentArea) return;
    contentArea.innerHTML = `<p style="text-align:center; padding:20px;">Loading students...</p>`;
    try {
        const user = window.currentUser;
        if (!user) { contentArea.innerHTML = `<p style="color:red;">Error: User not authenticated.</p>`; return; }
        if (user.role === "teacher") { return window.loadTeacherStudentsView(user.class); }
        const snapshot = await getDocs(collection(db, "students"));
        if (snapshot.size === 0) {
            contentArea.innerHTML = `<div style="text-align:center; padding:40px;"><i class="fa-solid fa-users" style="font-size:48px; color:#ccc;"></i><h3>No Students Found</h3><p style="color:#666;">There are no students in the database yet.</p><button onclick="addStudent()" style="background:#28a745; margin-top:10px;"><i class="fa-solid fa-user-plus"></i> Add First Student</button></div>`;
            return;
        }
        let html = `<div style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;"><span style="font-size:16px; color:#666;">Total: <strong>${snapshot.size}</strong> students</span><div><input type="text" id="studentSearchView" placeholder="🔍 Search by name..." style="padding:10px; border-radius:8px; border:1px solid #ccc; width:250px;" onkeyup="filterStudentsView()"></div></div>
            <div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:14px;">
            <thead><tr style="background:#003366; color:white;"><th style="padding:12px; text-align:left;">#</th><th style="padding:12px; text-align:left;">Student Name</th><th style="padding:12px; text-align:left;">Class</th><th style="padding:12px; text-align:left;">DOB</th><th style="padding:12px; text-align:left;">Gender</th><th style="padding:12px; text-align:center;">Actions</th></tr></thead><tbody>`;
        let count = 1;
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            html += `<tr style="border-bottom:1px solid #eee; transition:0.2s;" onmouseover="this.style.background='#f5f8ff'" onmouseout="this.style.background=''">
                <td style="padding:12px; text-align:center;">${count}</td>
                <td style="padding:12px;"><strong>${docSnap.id}</strong></td>
                <td style="padding:12px;"><span style="background:#e8f0fe; padding:4px 12px; border-radius:12px; font-size:12px;">${data.class || '-'}</span></td>
                <td style="padding:12px;">${data.dob || '-'}</td>
                <td style="padding:12px;"><span style="color:${data.gender === 'Male' ? '#0055aa' : '#d63384'};">${data.gender || '-'}</span></td>
                <td style="padding:12px; text-align:center;">
                    <button onclick="editStudent('${docSnap.id}')" style="background:#ffc107; color:black; margin:2px; padding:6px 12px; font-size:12px; border:none; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="viewStudentResults('${docSnap.id}')" style="background:#17a2b8; color:white; margin:2px; padding:6px 12px; font-size:12px; border:none; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-file-lines"></i></button>
                    <button onclick="deleteStudent('${docSnap.id}')" style="background:#dc3545; color:white; margin:2px; padding:6px 12px; font-size:12px; border:none; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                </td></tr>`;
            count++;
        });
        html += `</tbody></table></div>`;
        contentArea.innerHTML = html;
    } catch (error) {
        contentArea.innerHTML = `<div style="text-align:center; padding:40px; color:red;"><i class="fa-solid fa-circle-exclamation" style="font-size:48px;"></i><h3>Error Loading Students</h3><p>${error.message}</p><button onclick="viewAllStudents()" style="margin-top:10px;">Retry</button></div>`;
    }
};

window.loadTeacherStudentsView = async function(teacherClass) {
    const contentArea = document.getElementById("adminViewStudentsContent");
    contentArea.innerHTML = `<p style="text-align:center; padding:20px;">Loading ${teacherClass} students...</p>`;
    try {
        const snapshot = await getDocs(collection(db, "students"));
        let html = `<div style="background:#e8f0fe; padding:15px; border-radius:10px; margin-bottom:20px;"><h3 style="margin:0; color:#003366;">${teacherClass} - My Students</h3><p style="margin:5px 0 0; color:#666;">Students assigned to your class</p></div>`;
        let found = false;
        let count = 1;
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.class === teacherClass) {
                found = true;
                html += `<div style="padding:12px 15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; background:white; border-radius:5px; margin-bottom:5px;">
                    <div><strong>${count}. ${docSnap.id}</strong><span style="color:#666; margin-left:15px;">${data.gender || 'N/A'}</span><span style="background:#e8f0fe; padding:2px 10px; border-radius:12px; font-size:12px; margin-left:10px;">${data.dob || 'DOB not set'}</span></div>
                    <div><button onclick="viewStudentResults('${docSnap.id}')" style="background:#17a2b8; color:white; padding:6px 15px; border:none; border-radius:5px; cursor:pointer; margin:0 5px;"><i class="fa-solid fa-file-lines"></i> Results</button></div>
                </div>`;
                count++;
            }
        });
        if (!found) html += `<div style="text-align:center; padding:40px; color:#999;"><i class="fa-solid fa-users" style="font-size:48px;"></i><h3>No Students Found</h3><p>No students are currently assigned to ${teacherClass}.</p></div>`;
        contentArea.innerHTML = html;
    } catch (e) { contentArea.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`; }
};

window.filterStudentsView = function() {
    const searchTerm = document.getElementById("studentSearchView");
    if (!searchTerm) return;
    const term = searchTerm.value.toLowerCase().trim();
    const rows = document.querySelectorAll("#adminViewStudentsContent table tbody tr");
    rows.forEach((row) => {
        const nameCell = row.cells[1];
        if (nameCell) {
            const name = nameCell.textContent.toLowerCase();
            row.style.display = name.includes(term) ? "" : "none";
        }
    });
};

window.viewStudentResults = async function(studentName) {
    const term = prompt("Enter Term (Term 1 / Term 2 / Term 3):", "Term 3");
    const year = prompt("Enter Year:", "2026");
    if (!term || !year) return;
    try {
        const resultDocId = `${studentName}_${term}_${year}`;
        const resultSnap = await getDoc(doc(db, "results", resultDocId));
        if (resultSnap.exists()) {
            document.getElementById("adminViewStudentsPage").classList.add("hidden");
            document.getElementById("adminPanel").classList.add("hidden");
            document.getElementById("results").classList.remove("hidden");
            window.loadResults(studentName, resultSnap.data());
        } else {
            alert("No results found for this student in the selected term/year.");
        }
    } catch (e) { alert("Error: " + e.message); }
};

window.editStudent = async function(studentName) {
    try {
        const docSnap = await getDoc(doc(db, "students", studentName));
        if (!docSnap.exists()) return alert("Student not found");
        const data = docSnap.data();
        let classOptions = classes.map(cls => `<option value="${cls}" ${cls === data.class ? 'selected' : ''}>${cls}</option>`).join('');
        document.getElementById("adminViewStudentsPage").classList.add("hidden");
        document.getElementById("adminStudentPage").classList.remove("hidden");
        document.getElementById("adminStudentContent").innerHTML = `
            <h3>Edit Student: ${studentName}</h3>
            <input id="editName" value="${studentName}" placeholder="Full Name" style="margin-bottom:10px;">
            <select id="editClass" style="margin-bottom:10px;">${classOptions}</select>
            <input id="editDob" value="${data.dob || ''}" placeholder="DOB dd/mm/yyyy">
            <select id="editGender" style="margin-bottom:10px;"><option value="Male" ${data.gender === "Male" ? "selected" : ""}>Male</option><option value="Female" ${data.gender === "Female" ? "selected" : ""}>Female</option></select>
            <button onclick="saveEditedStudent('${studentName}')" style="background:#28a745;">Save Changes</button>
            <button onclick="viewAllStudents()">Cancel</button>
        `;
    } catch (e) { alert("Error: " + e.message); }
};

window.saveEditedStudent = async function(oldName) {
    const newName = document.getElementById("editName").value.trim();
    const sclass = document.getElementById("editClass").value;
    const sdob = document.getElementById("editDob").value.trim();
    const sgender = document.getElementById("editGender").value;
    if (!newName || !sclass || !sdob) return alert("All fields are required!");
    try {
        if (newName !== oldName) {
            await setDoc(doc(db, "students", newName), { class: sclass, dob: sdob, gender: sgender });
        } else {
            await setDoc(doc(db, "students", oldName), { class: sclass, dob: sdob, gender: sgender });
        }
        alert("Student updated successfully!");
        window.viewAllStudents();
    } catch (e) { alert("Error: " + e.message); }
};

window.deleteStudent = async function(studentName) {
    if (!confirm(`Delete student "${studentName}" and all their results?`)) return;
    try {
        await deleteDoc(doc(db, "students", studentName));
        const resultsSnapshot = await getDocs(collection(db, "results"));
        resultsSnapshot.forEach(async (resultDoc) => {
            if (resultDoc.id.startsWith(studentName + "_")) {
                await deleteDoc(resultDoc.ref);
            }
        });
        alert("Student deleted successfully!");
        window.viewAllStudents();
    } catch (e) { alert("Error deleting student: " + e.message); }
};

// ================= BULK UPLOAD =================
window.showBulkUpload = function() {
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminBulkUploadPage").classList.remove("hidden");
    
    const user = window.currentUser;
    let classOptions = user && user.role === "teacher" ? 
        `<option value="${user.class}" selected>${user.class}</option>` : 
        classes.map(cls => `<option value="${cls}">${cls}</option>`).join('');
    
    let html = `
        <button onclick="backToDashboard()" style="margin-bottom:15px;">← Back to Dashboard</button>
        <h3>Bulk Results Upload</h3>
        <p style="color:#555;">Upload results for an entire class</p>
        <div style="margin:15px 0;">
            <select id="bulkClass" style="padding:12px; width:100%; margin-bottom:10px;"><option value="">—— Select Class ——</option>${classOptions}</select>
            <select id="bulkTerm" style="padding:12px; width:100%; margin-bottom:10px;"><option value="Term 3" selected>Term 3</option><option value="Term 1">Term 1</option><option value="Term 2">Term 2</option></select>
            <input id="bulkYear" type="number" value="2026" style="padding:12px; width:100%; margin-bottom:15px;">
        </div>
        <div style="margin:20px 0; padding:20px; border:2px dashed #003366; border-radius:12px; text-align:center; background:#f8f9ff;">
            <button onclick="downloadTemplate()" style="background:#28a745; padding:12px 20px; margin-bottom:15px;"><i class="fa-solid fa-download"></i> Download Excel Template</button>
            <input type="file" id="excelFile" accept=".xlsx,.csv" style="margin:10px auto; display:block;">
            <small style="color:#666;">First column must be <strong>StudentName</strong></small>
        </div>
        <button onclick="processBulkUpload()" style="background:#003366; padding:12px 25px;">Process & Save Results</button>
        <div id="uploadStatus" style="margin-top:20px;"></div>
    `;
    document.getElementById("adminBulkUploadContent").innerHTML = html;
};
window.processBulkUpload = async function() {
    const fileInput = document.getElementById("excelFile");
    const className = document.getElementById("bulkClass").value;
    const term = document.getElementById("bulkTerm").value;
    const year = document.getElementById("bulkYear").value;
    const statusDiv = document.getElementById("uploadStatus");
    if (!fileInput.files[0] || !className || !term || !year) return alert("Please select class, term, year and upload a file.");
    statusDiv.innerHTML = `<p style="color:blue;">Processing file...</p>`;
    const file = fileInput.files[0];
    try {
        let data;
        if (file.name.endsWith('.xlsx')) {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        } else {
            const text = await file.text();
            const rows = text.trim().split('\n');
            data = rows.map(row => row.split(',').map(cell => cell.trim()));
        }
        let successCount = 0, errorCount = 0;
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 1) continue;
            const studentName = String(row[0]).trim();
            if (!studentName) continue;
            let scores = {}, total = 0;
            const gender = row[1] || "";
            subjects.forEach((subject, index) => {
                const score = parseInt(row[index + 2]) || 0;
                scores[subject] = score;
                total += score;
            });
            try {
                const resultId = `${studentName}_${term}_${year}`;
                const existing = await getDoc(doc(db, "results", resultId));
                if (existing.exists()) {
                    const overwrite = confirm(`${studentName} already has results for ${term} ${year}.\nOverwrite?`);
                    if (!overwrite) continue;
                }
                const studentRef = doc(db, "students", studentName);
                await setDoc(studentRef, { class: className, gender: gender }, { merge: true });
                await setDoc(doc(db, "results", resultId), {
                    scores: scores, total: total, class: className, classSize: 40, term: term, year: parseInt(year)
                });
                successCount++;
            } catch (err) { errorCount++; }
        }
        statusDiv.innerHTML = `<p style="color:green; font-weight:bold;">✅ Upload Complete!<br>Success: ${successCount} students<br>Failed: ${errorCount}</p>`;
        setTimeout(() => window.viewAllStudents(), 2500);
    } catch (e) { statusDiv.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`; }
};

window.downloadTemplate = function() {
    const wb = XLSX.utils.book_new();
    const headers = ["StudentName", "Gender", ...subjects];
    const sampleData = [headers, ["John Banda", "Male", 85, 78, 92, 88, 76, 94, 82, 89, 85], ["Mary Phiri", "Female", 65, 70, 75, 68, 80, 72, 68, 75, 70], ["Peter Mwale", "Male", 92, 88, 95, 90, 85, 96, 89, 91, 87], ["Grace Manda", "Female", 45, 55, 60, 50, 65, 48, 52, 58, 55], ["James Chawinga", "Male", 78, 82, 80, 85, 75, 88, 79, 83, 81]];
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, "Term 3 Results");
    XLSX.writeFile(wb, "Bandawe_Bulk_Results_Template.xlsx");
};

// ================= CLASS PERFORMANCE DASHBOARD =================
window.showClassDashboard = async function(selectedTerm = "Term 3", selectedYear = "2026") {
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminPerformancePage").classList.remove("hidden");
    
    // Hide any other open pages
    const pages = ["adminStudentPage", "adminCalendarPage", "adminNoticesPage", 
                   "adminViewStudentsPage", "adminBulkPage", "adminResultsPage"];
    pages.forEach(pageId => {
        const el = document.getElementById(pageId);
        if (el) el.classList.add("hidden");
    });
    
    // Create a new container for performance if it doesn't exist
    let perfPage = document.getElementById("adminPerformancePage");
    if (!perfPage) {
        perfPage = document.createElement("div");
        perfPage.id = "adminPerformancePage";
        document.body.appendChild(perfPage);
    }
    perfPage.classList.remove("hidden");
    perfPage.innerHTML = `<div style="max-width:1000px;margin:20px auto;padding:20px;"><p>Loading Class Performance...</p></div>`;
    
    try {
        const snapshot = await getDocs(collection(db, "results"));
        let classData = {};
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            if (d.term === selectedTerm && d.year == selectedYear) {
                if (!classData[d.class]) classData[d.class] = [];
                classData[d.class].push({ name: docSnap.id.split('_')[0], total: d.total || 0, scores: d.scores || {} });
            }
        });
        
        let html = `
            <div style="max-width:1000px;margin:20px auto;padding:20px;">
                <button onclick="backToDashboard()" style="margin-bottom:15px;">← Back to Dashboard</button><h3>Class Performance Dashboard</h3>
                <div style="margin:15px 0; padding:15px; background:#f8f9ff; border-radius:10px;">
                    <select id="dashTerm" onchange="refreshDashboard()" style="padding:10px; margin-right:10px;border-radius:6px;border:1px solid #ccc;">
                        <option value="Term 1" ${selectedTerm === "Term 1" ? "selected" : ""}>Term 1</option>
                        <option value="Term 2" ${selectedTerm === "Term 2" ? "selected" : ""}>Term 2</option>
                        <option value="Term 3" ${selectedTerm === "Term 3" ? "selected" : ""}>Term 3</option>
                    </select>
                    <select id="dashYear" onchange="refreshDashboard()" style="padding:10px;border-radius:6px;border:1px solid #ccc;">
                        <option value="2025" ${selectedYear === "2025" ? "selected" : ""}>2025</option>
                        <option value="2026" ${selectedYear === "2026" ? "selected" : ""}>2026</option>
                        <option value="2027" ${selectedYear === "2027" ? "selected" : ""}>2027</option>
                    </select>
                    <!-- EXPORT BUTTON HERE -->
                    <button onclick="triggerClassExport()" style="background: #28a745; color: white; padding: 10px 20px; font-size: 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                        📊 Export All Class Results (Excel)
                    </button>
                </div>`;
        
        Object.keys(classData).sort().forEach(cls => {
            const students = classData[cls];
            const totalStudents = students.length;
            if (totalStudents === 0) return;
            let totalScoreSum = 0;
            students.forEach(s => totalScoreSum += s.total);
            const classAverage = (totalScoreSum / totalStudents).toFixed(1);
            students.sort((a, b) => b.total - a.total);
            html += `<div style="background:white; padding:20px; margin:15px 0; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                <h4>${cls} (${totalStudents} students) — Class Average: <strong>${classAverage}</strong></h4>
                <canvas id="chart-${cls.replace(/\s+/g,'')}" style="margin:15px 0; max-height:280px;"></canvas>
                <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                <tr style="background:#003366; color:white;"><th style="padding:10px; text-align:left;">Position</th><th style="padding:10px; text-align:left;">Student Name</th><th style="padding:10px; text-align:center;">Total</th><th style="padding:10px; text-align:left;">Action</th></tr>`;
            students.slice(0, 8).forEach((student, index) => {
                html += `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px;">${index + 1}</td><td style="padding:10px;">${student.name}</td><td style="padding:10px; text-align:center; font-weight:bold;">${student.total}</td><td style="padding:10px;"><button onclick="viewStudentHistory('${student.name}')" style="padding:6px 12px;background:#17a2b8;color:white;border:none;border-radius:4px;cursor:pointer;">History</button></td></tr>`;
            });
            html += `</table></div>`;
        });
        
        if (Object.keys(classData).length === 0) html += `<p>No results found for ${selectedTerm} ${selectedYear}.</p>`;
        
        html += `</div>`;
        perfPage.innerHTML = html;
        
        setTimeout(() => {
            Object.keys(classData).forEach(cls => {
                const students = classData[cls].slice(0, 8);
                const names = students.map(s => s.name.length > 12 ? s.name.substring(0,12)+'...' : s.name);
                const totals = students.map(s => s.total);
                const canvas = document.getElementById(`chart-${cls.replace(/\s+/g,'')}`);
                if (canvas) {
                    new Chart(canvas, {
                        type: 'bar', 
                        data: { 
                            labels: names, 
                            datasets: [{ 
                                label: 'Total Score', 
                                data: totals, 
                                backgroundColor: '#0055aa', 
                                borderColor: '#003366', 
                                borderWidth: 1 
                            }] 
                        },
                        options: { 
                            responsive: true, 
                            plugins: { legend: { display: false } }, 
                            scales: { y: { beginAtZero: true, max: subjects.length * 100 } } 
                        }
                    });
                }
            });
        }, 300);
    } catch (e) {
        perfPage.innerHTML = `<div style="max-width:1000px;margin:20px auto;padding:20px;"><p style="color:red;">Error: ${e.message}</p></div>`;
    }
};
window.triggerClassExport = function() {
    const term = document.getElementById("dashTerm")?.value || "Term 3";
    const year = document.getElementById("dashYear")?.value || "2026";
    if (typeof window.exportAllClassesResults === "function") {
        window.exportAllClassesResults(term, year);
    } else {
        alert("Export feature is not initialized.");
    }
};

window.showGradeSummary = async function() {
    window.openAdminPage();
    document.getElementById("adminArea").innerHTML = `<p>Loading Grade Summary...</p>`;
    try {
        const resultsSnapshot = await getDocs(collection(db, "results"));
        const studentsSnapshot = await getDocs(collection(db, "students"));
        let studentGender = {};
        studentsSnapshot.forEach(docSnap => { studentGender[docSnap.id] = docSnap.data().gender || "Unknown"; });
        let summary = {};
        resultsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const className = data.class || "Unknown";
            if (!summary[className]) { summary[className] = { boysSat: 0, girlsSat: 0, boysPassed: 0, girlsPassed: 0, boysFailed: 0, girlsFailed: 0 }; }
            const studentName = docSnap.id.split("_")[0];
            const gender = studentGender[studentName];
            const passed = ((data.total || 0) / (subjects.length * 100)) >= 0.4;
            if (gender === "Male") { summary[className].boysSat++; if (passed) summary[className].boysPassed++; else summary[className].boysFailed++; } 
            else if (gender === "Female") { summary[className].girlsSat++; if (passed) summary[className].girlsPassed++; else summary[className].girlsFailed++; }
        });
        let html = `<button onclick="backToDashboard()" style="margin-bottom:15px;"><i class="fa-solid fa-arrow-left"></i> Back to Dashboard</button><h3>Grade Summary Dashboard</h3>
            <table style="width:100%; border-collapse:collapse; margin-top:20px;">
            <tr style="background:#003366; color:white;"><th>Class</th><th>Boys Sat</th><th>Girls Sat</th><th>Total Sat</th><th>Boys Passed</th><th>Girls Passed</th><th>Total Passed</th><th>Pass Rate</th></tr>`;
        Object.keys(summary).sort().forEach(cls => {
            const s = summary[cls];
            const totalSat = s.boysSat + s.girlsSat;
            const totalPassed = s.boysPassed + s.girlsPassed;
            const passRate = totalSat > 0 ? ((totalPassed / totalSat) * 100).toFixed(1) : 0;
            html += `<tr style="border-bottom:1px solid #ddd;"><td style="padding:10px;"><strong>${cls}</strong></td><td style="padding:10px; text-align:center;">${s.boysSat}</td><td style="padding:10px; text-align:center;">${s.girlsSat}</td><td style="padding:10px; text-align:center; font-weight:bold;">${totalSat}</td><td style="padding:10px; text-align:center; color:green;">${s.boysPassed}</td><td style="padding:10px; text-align:center; color:green;">${s.girlsPassed}</td><td style="padding:10px; text-align:center; font-weight:bold;">${totalPassed}</td><td style="padding:10px; text-align:center; font-weight:bold; color:#003366;">${passRate}%</td></tr>`;
        });
        html += `</table>`;
        document.getElementById("adminArea").innerHTML = html;
    } catch (e) { document.getElementById("adminArea").innerHTML = `<p style="color:red;">Error: ${e.message}</p>`; }
};

window.refreshDashboard = function() {
    const term = document.getElementById("dashTerm").value;
    const year = document.getElementById("dashYear").value;
    window.showClassDashboard(term, year);
};

window.viewStudentHistory = async function(studentName) {
    console.log("viewStudentHistory called for:", studentName);
    
    // Hide admin panel
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminPanel").style.display = "none";
    
    // Hide performance page
    const perfPage = document.getElementById("adminPerformancePage");
    if (perfPage) {
        perfPage.style.display = "none";
    }
    
    // Create a new container for history
    let historyPage = document.getElementById("adminHistoryPage");
    if (!historyPage) {
        historyPage = document.createElement("div");
        historyPage.id = "adminHistoryPage";
        document.body.appendChild(historyPage);
    }
    historyPage.style.display = "block";
    historyPage.innerHTML = `<div style="max-width:900px;margin:20px auto;padding:20px;"><p>Loading ${studentName}'s history...</p></div>`;
    
    try {
        const snapshot = await getDocs(collection(db, "results"));
        let history = [];
        snapshot.forEach(docSnap => {
            if (docSnap.id.startsWith(studentName + "_")) {
                const d = docSnap.data();
                history.push({ term: d.term, year: d.year, total: d.total, class: d.class, scores: d.scores || {} });
            }
        });
        history.sort((a, b) => b.year - a.year || b.term.localeCompare(a.term));
        
        let html = `
            <div style="max-width:900px;margin:20px auto;padding:20px;">
                <button onclick="backToDashboardFromHistory()" style="margin-bottom:15px;padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:8px;cursor:pointer;">
                    <i class="fa-solid fa-arrow-left"></i> Back
                </button>
                <h3>Academic History - ${studentName}</h3>`;
                
        if (history.length === 0) { 
            html += `<p>No results found yet.</p>`; 
        } else {
            history.forEach(record => {
                html += `<div style="background:white; padding:18px; margin:12px 0; border-radius:10px; border-left:5px solid #003366;">
                    <strong>${record.term} ${record.year} • ${record.class}</strong><br>
                    <strong>Total: ${record.total} / ${subjects.length * 100}</strong>
                    <button onclick="loadSingleResult('${studentName}', '${record.term}', '${record.year}')" style="margin-left:15px; padding:6px 12px;background:#17a2b8;color:white;border:none;border-radius:4px;cursor:pointer;">View Full Report</button>
                </div>`;
            });
        }
        html += `</div>`;
        historyPage.innerHTML = html;
    } catch (e) { 
        historyPage.innerHTML = `<div style="max-width:900px;margin:20px auto;padding:20px;"><p style="color:red;">Error: ${e.message}</p><button onclick="backToDashboardFromHistory()" style="margin-top:15px;padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:8px;cursor:pointer;">Back</button></div>`;
    }
};

window.exportAllClassesResults = async function(selectedTerm = "Term 3", selectedYear = "2026") {
    try {
        // Fetch all results and students
        const resultsSnap = await getDocs(collection(db, "results"));
        const studentsSnap = await getDocs(collection(db, "students"));

        // Map student metadata (Gender, DOB, etc.)
        const studentMetaMap = {};
        studentsSnap.forEach(docSnap => {
            studentMetaMap[docSnap.id] = docSnap.data();
        });

        // Group results by Class
        const classResultsMap = {};
        classes.forEach(c => classResultsMap[c] = []);

        resultsSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.term === selectedTerm && String(data.year) === String(selectedYear)) {
                const studentName = docSnap.id.split('_')[0];
                const meta = studentMetaMap[studentName] || {};
                const className = data.class || meta.class;

                if (classResultsMap[className]) {
                    classResultsMap[className].push({
                        name: studentName,
                        gender: meta.gender || "Unknown",
                        scores: data.scores || {},
                        classSize: data.classSize || 40
                    });
                }
            }
        });

        const workbook = XLSX.utils.book_new();

        classes.forEach(className => {
            const list = classResultsMap[className];

            // 1. Calculate totals & dynamically set pass/fail criteria per student
            list.forEach(student => {
                let totalScore = 0;
                let satCount = 0;

                subjects.forEach(sub => {
                    const sc = Number(student.scores[sub]) || 0;
                    if (sc > 0) {
                        totalScore += sc;
                        satCount++;
                    }
                });

                student.satCount = satCount;
                student.totalScore = totalScore;
                student.maxPossible = satCount * 100;
                
                // Calculate percentage based on sat subjects
                const percentage = student.maxPossible > 0 ? (totalScore / student.maxPossible) * 100 : 0;
                student.status = percentage >= 40 ? "PASS" : "FAIL";
            });

            // 2. Rank students by total marks obtained
            list.sort((a, b) => b.totalScore - a.totalScore);

            // 3. Prepare Sheet Headers & Data Rows
            const headers = ["Pos", "Learner Name", "Gender", ...subjects, "Total Marks Obtained", "Status"];
            const sheetRows = [headers];

            let boysSat = 0, girlsSat = 0;
            let boysPassed = 0, girlsPassed = 0;
            let boysFailed = 0, girlsFailed = 0;

            list.forEach((student, idx) => {
                const isMale = student.gender.toLowerCase() === "male";
                const isFemale = student.gender.toLowerCase() === "female";

                if (isMale) {
                    boysSat++;
                    if (student.status === "PASS") boysPassed++;
                    else boysFailed++;
                } else if (isFemale) {
                    girlsSat++;
                    if (student.status === "PASS") girlsPassed++;
                    else girlsFailed++;
                }

                const subScores = subjects.map(sub => student.scores[sub] !== undefined ? student.scores[sub] : "-");
                const row = [
                    idx + 1,
                    student.name,
                    student.gender,
                    ...subScores,
                    `${student.totalScore} / ${student.maxPossible}`,
                    student.status
                ];
                sheetRows.push(row);
            });

            // Add blank spacing row before summary table
            sheetRows.push([]);
            sheetRows.push(["--- CLASS PERFORMANCE SUMMARY ---"]);

            // 4. Compact Summary Table Rows
            const totalSat = boysSat + girlsSat;
            const totalPassed = boysPassed + girlsPassed;
            const totalFailed = boysFailed + girlsFailed;
            const overallPassRate = totalSat > 0 ? ((totalPassed / totalSat) * 100).toFixed(1) + "%" : "0%";

            sheetRows.push(["Category", "Boys", "Girls", "Total"]);
            sheetRows.push(["Learners Sat", boysSat, girlsSat, totalSat]);
            sheetRows.push(["Learners Passed", boysPassed, girlsPassed, totalPassed]);
            sheetRows.push(["Learners Failed", boysFailed, girlsFailed, totalFailed]);
            sheetRows.push(["Pass Rate", boysSat > 0 ? ((boysPassed / boysSat) * 100).toFixed(1) + "%" : "0%", 
                                        girlsSat > 0 ? ((girlsPassed / girlsSat) * 100).toFixed(1) + "%" : "0%", 
                                        overallPassRate]);

            const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

            // 5. Compact formatting: Set tight column widths matching text sizes
            const colWidths = [
                { wch: 5 },   // Pos
                { wch: 20 },  // Name
                { wch: 8 },   // Gender
                ...subjects.map(() => ({ wch: 6 })), // Compact subject scores
                { wch: 18 },  // Total Marks
                { wch: 8 }    // Status
            ];
            worksheet['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(workbook, worksheet, className);
        });

        // 6. Download the generated workbook file
        XLSX.writeFile(workbook, `Bandawe_All_Classes_${selectedTerm}_${selectedYear}.xlsx`);
        alert("Export successful!");

    } catch (error) {
        console.error("Export Error:", error);
        alert("Export failed: " + error.message);
    }
};

window.backToDashboardFromHistory = function() {
    // Remove history page
    const historyPage = document.getElementById("adminHistoryPage");
    if (historyPage) {
        historyPage.remove();
    }
    
    // Show performance page again
    const perfPage = document.getElementById("adminPerformancePage");
    if (perfPage) {
        perfPage.style.display = "block";
    } else {
        // If performance page was removed, go to dashboard
        document.getElementById("adminPanel").classList.remove("hidden");
        document.getElementById("adminPanel").style.display = "block";
        
        const area = document.getElementById("adminArea");
        if (area) {
            area.innerHTML = "";
            area.style.display = "block";
        }
        
        const menu = document.getElementById("dashboardMenu");
        if (menu) menu.style.display = "block";
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.loadSingleResult = async function(studentName, term, year) {
    try {
        const resultId = `${studentName}_${term}_${year}`;
        const snap = await getDoc(doc(db, "results", resultId));
        if (!snap.exists()) return alert("Result not found");
        document.getElementById("adminPanel").classList.add("hidden");
        document.getElementById("results").classList.remove("hidden");
        window.loadResults(studentName, snap.data());
    } catch (e) { alert("Error loading report: " + e.message); }
};

// ================= MANAGE USERS =================
window.manageUsers = function() {
    console.log("manageUsers called - opening as separate page");
    
    const user = window.currentUser;
    if (user.role !== "admin") {
        alert("Only Administrators can manage users.");
        return;
    }
    
    // Hide admin panel
    document.getElementById("adminPanel").classList.add("hidden");
    
    // Hide any other open pages
    const pages = ["adminStudentPage", "adminCalendarPage", "adminNoticesPage", 
                   "adminViewStudentsPage", "adminBulkPage", "adminResultsPage", 
                   "adminPerformancePage"];
    pages.forEach(pageId => {
        const el = document.getElementById(pageId);
        if (el) el.classList.add("hidden");
    });
    
    // Create a new container for users if it doesn't exist
    let usersPage = document.getElementById("adminUsersPage");
    if (!usersPage) {
        usersPage = document.createElement("div");
        usersPage.id = "adminUsersPage";
        document.body.appendChild(usersPage);
    }
    usersPage.classList.remove("hidden");
    
    let classOptions = classes.map(cls => `<option value="${cls}">${cls}</option>`).join('');
    
    usersPage.innerHTML = `
        <div style="max-width:800px;margin:20px auto;padding:20px;">
            <button onclick="backToDashboard()" style="margin-bottom:15px;padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:8px;cursor:pointer;">
                <i class="fa-solid fa-arrow-left"></i> Back to Dashboard
            </button>
            <h3>Manage Users (Admin Only)</h3>
            <div style="background:#f8f9ff; padding:20px; border-radius:12px;">
                <h4>Create New Teacher Account</h4>
                <input id="teacherEmail" type="email" placeholder="Teacher Email" style="width:100%;padding:12px;margin-bottom:10px;border-radius:8px;border:1px solid #ccc;">
                <input id="teacherName" placeholder="Full Name" style="width:100%;padding:12px;margin-bottom:10px;border-radius:8px;border:1px solid #ccc;">
                <select id="teacherClass" style="width:100%;padding:12px;margin-bottom:10px;border-radius:8px;border:1px solid #ccc;">
                    <option value="">—— Assign Class ——</option>
                    ${classOptions}
                </select>
                <input id="teacherPassword" type="password" placeholder="Password (min 6 chars)" style="width:100%;padding:12px;margin-bottom:15px;border-radius:8px;border:1px solid #ccc;">
                <button onclick="createTeacherAccount()" style="background:#28a745;padding:12px 25px;border:none;border-radius:8px;color:white;cursor:pointer;">
                    <i class="fa-solid fa-user-plus"></i> Create Teacher Account
                </button>
            </div>
            <div style="margin-top:20px;">
            </div>
        </div>
    `;
};

window.createTeacherAccount = async function() {
    const email = document.getElementById("teacherEmail").value.trim();
    const fullName = document.getElementById("teacherName").value.trim();
    const assignedClass = document.getElementById("teacherClass").value;
    const password = document.getElementById("teacherPassword").value.trim();
    if (!email || !fullName || !assignedClass || !password) return alert("All fields are required!");
    if (password.length < 6) return alert("Password must be at least 6 characters!");
    try {
        const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
        await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", email), { role: "teacher", fullName: fullName, class: assignedClass, createdAt: new Date() });
        alert(`✅ Teacher account created successfully!\n\nEmail: ${email}\nPassword: ${password}`);
        await signOut(auth);
        alert("Teacher created. Please login again as admin.");
        location.reload();
    } catch (e) { alert("Error creating account: " + e.message); }
};

// ================= MANAGE NOTICES =================
window.manageNotices = function(){
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminNoticesPage").classList.remove("hidden");
    document.getElementById("adminNoticeContent").innerHTML = `
        <h3>Add New Notice</h3>
        <input id="noticeTitle" placeholder="Notice Title" style="width:100%;padding:10px;margin-bottom:10px;">
        <textarea id="noticeMessage" placeholder="Notice Message" style="width:100%;height:120px;padding:10px;"></textarea>
        <button onclick="saveNotice()"><i class="fa-solid fa-save"></i> Save Notice</button>
        <hr><h3>Existing Notices</h3><div id="noticeList"></div>
    `;
    loadNoticesAdmin();
};

window.saveNotice = async function(){
    const title = document.getElementById("noticeTitle").value.trim();
    const message = document.getElementById("noticeMessage").value.trim();
    if(!title || !message) return alert("Fill all fields");
    await addDoc(collection(db,"announcements"), { title: title, message: message, date: new Date(), active: true });
    alert("Notice saved");
    window.manageNotices();
};

async function loadNoticesAdmin(){
    const box = document.getElementById("noticeList");
    box.innerHTML = "Loading notices...";
    const snapshot = await getDocs(collection(db,"announcements"));
    let notices = [];
    snapshot.forEach(docSnap => { notices.push({ id: docSnap.id, ...docSnap.data() }); });
    notices.sort((a,b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
    let html = "";
    notices.forEach(notice => {
        html += `<div style="padding:15px; border-bottom:1px solid #ddd; margin-bottom:10px;">
            <h4 style="margin:0;">${notice.title}</h4><p>${notice.message}</p>
            <button onclick="editNotice('${notice.id}')" style="background:#ffc107; color:black;"><i class="fa-solid fa-pen"></i> Edit</button>
            <button onclick="deleteNotice('${notice.id}')" style="background:#dc3545; color:white;"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>`;
    });
    box.innerHTML = html || "No notices available.";
}

window.editNotice = async function(id){
    const snap = await getDoc(doc(db,"announcements",id));
    if(!snap.exists()) return alert("Notice not found");
    const data = snap.data();
    document.getElementById("adminArea").innerHTML = `
        <button onclick="backToDashboard()" style="margin-bottom:15px;">← Back to Dashboard</button>
        <h3>Edit Notice</h3>
        <input id="editNoticeTitle" value="${data.title}" style="width:100%;margin-bottom:10px;">
        <textarea id="editNoticeMessage" style="width:100%;height:100px;margin-bottom:10px;">${data.message}</textarea>
        <button onclick="updateNotice('${id}')">Save Changes</button>
        <button onclick="manageNotices()">Cancel</button>
    `;
};

window.updateNotice = async function(id){
    const title = document.getElementById("editNoticeTitle").value.trim();
    const message = document.getElementById("editNoticeMessage").value.trim();
    if(!title || !message) return alert("All fields required");
    const oldDoc = await getDoc(doc(db,"announcements",id));
    const oldData = oldDoc.data();
    await setDoc(doc(db,"announcements",id), { title: title, message: message, date: oldData.date || new Date(), active: true });
    alert("Notice updated successfully");
    window.manageNotices();
};

window.deleteNotice = async function(id){
    if(!confirm("Delete this notice?")) return;
    await deleteDoc(doc(db,"announcements",id));
    alert("Notice deleted");
    window.manageNotices();
};

// ================= MANAGE CALENDAR =================
window.manageCalendar = function(){
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminCalendarPage").classList.remove("hidden");
    document.getElementById("adminCalendarContent").innerHTML = `
        <div style="background:#f8f9ff; padding:20px; border-radius:12px;">
            <h3>Add Calendar Event</h3>
            <input id="calendarDate" placeholder="Date e.g. 14 September 2026" style="width:100%;padding:10px;margin-bottom:10px;">
            <textarea id="calendarEvent" placeholder="Event description" style="width:100%;height:100px;padding:10px;"></textarea>
            <br><br>
            <button onclick="saveCalendarEvent()"><i class="fa-solid fa-save"></i> Save Calendar</button>
        </div>
        <hr><h3>Existing Calendar</h3><div id="calendarList">Loading...</div>
    `;
    loadCalendarAdmin();
};

window.saveCalendarEvent = async function(){
    const date = document.getElementById("calendarDate").value.trim();
    const activity = document.getElementById("calendarEvent").value.trim();
    if(!date || !activity) return alert("Please fill all fields");
    try {
        await addDoc(collection(db,"calendar"), { date: date, activity: activity, active: true, createdAt: new Date() });
        alert("Calendar event saved");
        window.manageCalendar();
    } catch(e) { alert("Error: " + e.message); }
};

async function loadCalendarAdmin(){
    const box = document.getElementById("calendarList");
    box.innerHTML = "Loading...";
    const snapshot = await getDocs(collection(db,"calendar"));
    let html = "";
    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        html += `<div style="padding:15px; border-bottom:1px solid #ddd;">
            <strong>${d.date}</strong><br>${d.activity}<br><br>
            <button onclick="editCalendar('${docSnap.id}')" style="background:#ffc107;color:black;"><i class="fa-solid fa-pen"></i> Edit</button>
            <button onclick="deleteCalendar('${docSnap.id}')" style="background:#dc3545;color:white;"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>`;
    });
    box.innerHTML = html || "No calendar events added yet.";
}

window.editCalendar = async function(id){
    const snap = await getDoc(doc(db,"calendar",id));
    if(!snap.exists()) return alert("Calendar item not found");
    const data = snap.data();
    document.getElementById("adminArea").innerHTML = `
        <button onclick="backToDashboard()" style="margin-bottom:15px;">← Back to Dashboard</button>
        <h3>Edit Calendar Event</h3>
        <input id="editCalendarDate" value="${data.date}" style="width:100%;margin-bottom:10px;">
        <input id="editCalendarActivity" value="${data.activity}" style="width:100%;margin-bottom:10px;">
        <button onclick="updateCalendar('${id}')">Save Changes</button>
        <button onclick="manageCalendar()">Cancel</button>
    `;
};

window.updateCalendar = async function(id){
    const date = document.getElementById("editCalendarDate").value.trim();
    const activity = document.getElementById("editCalendarActivity").value.trim();
    if(!date || !activity) return alert("All fields required");
    await setDoc(doc(db,"calendar",id), { date: date, activity: activity, active: true });
    alert("Calendar updated");
    window.manageCalendar();
};

window.deleteCalendar = async function(id){
    if(!confirm("Delete this calendar event?")) return;
    await deleteDoc(doc(db,"calendar",id));
    alert("Calendar event deleted");
    window.manageCalendar();
};

console.log("✅ All functions loaded successfully!");

window.manageGallery = function() {
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("adminGalleryPage").classList.remove("hidden");
    
    document.getElementById("adminGalleryContent").innerHTML = `
        <button onclick="backToDashboard()" style="margin-bottom:15px;">← Back to Dashboard</button>
        <h3><i class="fa-solid fa-images"></i> Manage Gallery</h3>
        
        <div style="background:#f8f9ff; padding:20px; border-radius:12px; margin:15px 0;">
            <h4>Add New Image</h4>
            <input id="newImageUrl" placeholder="Image URL" style="width:100%; padding:12px; margin:8px 0;">
            <input id="newImageCaption" placeholder="Caption" style="width:100%; padding:12px; margin:8px 0;">
            <select id="newImageCategory" style="width:100%; padding:12px; margin:8px 0;">
                <option value="campus">Campus</option>
                <option value="academic">Academics</option>
                <option value="vocational">Vocational</option>
                <option value="events">Events</option>
                <option value="sports">Sports</option>
            </select>
            <button onclick="addGalleryImage()" style="background:#28a745; padding:12px 20px;">Add Image</button>
        </div>
        
        <h4>Current Images</h4>
        <div id="adminGalleryList" style="max-height:500px; overflow-y:auto;"></div>
    `;
    
    renderAdminGalleryList();
};
window.addGalleryImage = function() {
    const url = document.getElementById("newImageUrl").value.trim();
    const caption = document.getElementById("newImageCaption").value.trim();
    const category = document.getElementById("newImageCategory").value;
    
    if (!url || !caption) return alert("URL and Caption required!");
    
    galleryImages.push({
        id: Date.now(),
        url: url,
        category: category,
        caption: caption
    });
    
    alert("Image added to gallery!");
    renderAdminGalleryList();
};

function renderAdminGalleryList() {
    const container = document.getElementById("adminGalleryList");
    let html = "";
    galleryImages.forEach((img, i) => {
        html += `
            <div style="border:1px solid #ddd; padding:10px; margin:8px 0; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <img src="${img.url}" style="height:60px; border-radius:6px;"> 
                    <strong>${img.caption}</strong> (${img.category})
                </div>
                <button onclick="deleteGalleryImage(${i})" style="background:#dc3545; color:white; border:none; padding:6px 12px;">Delete</button>
            </div>`;
    });
    container.innerHTML = html || "<p>No images yet.</p>";
}

window.deleteGalleryImage = function(index) {
    if (confirm("Delete this image?")) {
        galleryImages.splice(index, 1);
        renderAdminGalleryList();
    }
};
