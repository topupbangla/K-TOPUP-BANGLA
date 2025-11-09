/**
 * * =========================================
 * ⚙️ অংশ ১: কনফিগারেশন এবং ইনিশিয়ালাইজেশন
 * =========================================
 * * এই অংশে Firebase SDK কনফিগার করা হয়েছে এবং প্রাথমিক ডেটাবেস রেফারেন্স তৈরি করা হয়েছে।
 * */

// Firebase Configuration (Replace with your actual keys if needed, but the provided one is used)
const firebaseConfig = {
    apiKey: "AIzaSyCMw9hLWC0-FDA-w5Zw4mztJ_Gf6hi70RA",
    authDomain: "t-shop-451db.firebaseapp.com",
    databaseURL: "https://t-shop-451db-default-rtdb.firebaseio.com/",
    projectId: "t-shop-451db",
    storageBucket: "t-shop-451db.firebasestorage.app",
    messagingSenderId: "207345638429",
    appId: "1:207345638429:web:82c5a5199e73ce1640faf4",
    measurementId: "G-L1Z0DJC4PS"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref("/");


/**
 * * =========================================
 * 🌐 অংশ ২: DOM এলিমেন্টস এবং গ্লোবাল ভ্যারিয়েবল
 * =========================================
 * * এই অংশে HTML ডকুমেন্ট থেকে প্রয়োজনীয় এলিমেন্টগুলো সংগ্রহ করা হয়েছে এবং গ্লোবাল ভ্যারিয়েবলগুলো সংজ্ঞায়িত করা হয়েছে।
 * */

// DOM Elements - General
let shopNameDiv = document.getElementById("shopNameDiv");
// header element intentionally removed; keep variable but it may be null
let header = document.getElementById("mainHeader"); // This will be null based on index.html
let homeContainer = document.getElementById('home');
let selectedProduct = null;

// Auth UI elements
const authModal = document.getElementById('authModal');
const registerPanel = document.getElementById('registerPanel');
const loginPanel = document.getElementById('loginPanel');
const regMsg = document.getElementById('regMsg');
const loginMsg = document.getElementById('loginMsg');

// Profile Modal elements
const profileModal = document.getElementById('profileModal');
const profileModalTitle = document.getElementById('profileModalTitle');
const profileFields = document.getElementById('profileFields');
const profileLoginOption = document.getElementById('profileLoginOption');
const profileFullName = document.getElementById('profileFullName');
const profileUserName = document.getElementById('profileUserName');
const profileEmail = document.getElementById('profileEmail');
let cachedProfileInfo = {};

// Order elements
const orderAlertModal = document.getElementById('orderAlertModal');
const myOrdersModal = document.getElementById('myOrdersModal');
const myOrdersListEl = document.getElementById('myOrdersList');

// Variables to hold realtime listeners for My Orders (Crucial for cleanup)
let myOrdersQueryRef = null;
let myOrdersValueListener = null;
let myOrdersChildRemovedListener = null;

let isLoggedIn = false;


/**
 * * =========================================
 * 🛠️ অংশ ৩: ইউটিলিটি ফাংশন
 * =========================================
 * * এই অংশে সাধারণ এবং সহায়ক ফাংশনগুলো রাখা হয়েছে (যেমন: Gmail বৈধতা এবং HTML এস্কেপিং)।
 * */

// Utility: Check for valid Gmail
function isValidGmail(email){
    if(!email) return false;
    const e = String(email).trim().toLowerCase();
    // allow gmail.com and googlemail.com
    return /^[a-z0-9._%+-]+@(gmail\.com|googlemail\.com)$/.test(e);
}

// Utility: escape HTML (Security best practice)
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}


/**
 * * =========================================
 * 🔐 অংশ ৪: প্রমাণীকরণ (AUTH) UI ফাংশন
 * =========================================
 * * এই অংশে প্রমাণীকরণ (Login/Register) মডেলগুলো খোলা ও বন্ধ করার ফাংশন এবং ট্যাব পরিবর্তন করার লজিক রয়েছে।
 * */

// --- Modals for General/Order Alerts ---
window.openOrderAlertModal = function(){
    orderAlertModal.style.display = 'flex';
    orderAlertModal.setAttribute('aria-hidden','false');
}
window.closeOrderAlertModal = function(){
    orderAlertModal.style.display = 'none';
    orderAlertModal.setAttribute('aria-hidden','true');
}

// --- Auth Modal Control ---
window.openCreateAccount = function(e){
    if(e && typeof e.stopPropagation === 'function') e.stopPropagation();
    closeProfileModal();
    setTimeout(()=>{
        authModal.style.display='flex';
        authModal.setAttribute('aria-hidden','false');
        switchAuthTab('register');
    }, 120);
}

window.closeAuthModal = function(){
    authModal.style.display='none';
    authModal.setAttribute('aria-hidden','true');
    regMsg.innerText=''; loginMsg.innerText='';
}
window.switchAuthTab = function(tab){
    if(tab==='register'){
        registerPanel.style.display='block';
        loginPanel.style.display='none';
        document.getElementById('regTab').className='tabActive';
        document.getElementById('loginTab').className='tabInactive';
        document.getElementById('regTab').setAttribute('aria-selected','true');
        document.getElementById('loginTab').setAttribute('aria-selected','false');
    } else {
        registerPanel.style.display='none';
        loginPanel.style.display='block';
        document.getElementById('regTab').className='tabInactive';
        document.getElementById('loginTab').className='tabActive';
        document.getElementById('regTab').setAttribute('aria-selected','false');
        document.getElementById('loginTab').setAttribute('aria-selected','true');
    }
}


/**
 * * =========================================
 * 📝 অংশ ৫: রেজিস্ট্রেশন এবং লগইন লজিক
 * =========================================
 * * এই অংশে Firebase Authentication ব্যবহার করে ব্যবহারকারী তৈরি (Create User) এবং লগইন (Sign In) করার লজিক রয়েছে।
 * */

// --- Create Account from Modal ---
window.createAccount = async function(){
    regMsg.style.color='black';
    regMsg.innerText='Processing...';
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const emailInput = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    // Validation checks
    if(!fullName){ regMsg.style.color='red'; regMsg.innerText='Full Name দিতে হবে।'; return; }
    if(!username){ regMsg.style.color='red'; regMsg.innerText='Username দিতে হবে।'; return; }
    if(!emailInput){ regMsg.style.color='red'; regMsg.innerText='Gmail ঠিকানা দিতে হবে (e.g. example@gmail.com)।'; return; }
    if(!isValidGmail(emailInput)){ regMsg.style.color='red'; regMsg.innerText='কেবল Gmail ঠিকানা গ্রহণ করা হয় (gmail.com বা googlemail.com)।'; return; }
    if(!pass || !confirm){ regMsg.style.color='red'; regMsg.innerText='Password ও Confirm চাই।'; return; }
    if(pass !== confirm){ regMsg.style.color='red'; regMsg.innerText='Password মিলছে না।'; return; }

    try{
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const userCred = await firebase.auth().createUserWithEmailAndPassword(emailInput, pass);
        await userCred.user.updateProfile({displayName: username});
        const userId = userCred.user.uid;
        await firebase.database().ref('users/' + userId).set({
            username: username,
            fullName: fullName,
            email: emailInput,
            createdAt: new Date().toISOString()
        });
        cachedProfileInfo = {
            fullName: fullName,
            username: username,
            email: emailInput
        };
        regMsg.style.color='green';
        regMsg.innerText='✅ রেজিস্ট্রেশন সফল হয়েছে। তুমি এখন লগইন অবস্থায় আছো।';
        setTimeout(()=>{ closeAuthModal(); },900);
    }catch(err){
        console.error(err);
        regMsg.style.color='red';
        if(err.code === 'auth/email-already-in-use'){
            regMsg.innerText = 'এই Gmail ইমেইলটি আগে থেকেই ব্যবহৃত। অন্য Gmail ব্যবহার করুন।';
        } else if(err.code === 'auth/weak-password'){
            regMsg.innerText = 'পাসওয়ার্ড খুব দুর্বল। কমপক্ষে ৬ ক্যারেক্টার দিন।';
        } else if(err.code === 'auth/invalid-email'){
            regMsg.innerText = 'ইমেইল ফরম্যাট সঠিক নয়।';
        } else {
            regMsg.innerText = 'সমস্যা হয়েছে: ' + (err.message || err.code);
        }
    }
}

// --- Create Account from Dedicated Page (Similar to modal function, but different DOM elements) ---
window.createAccountFromPage = async function(){
    const fullName = document.getElementById('newFullName').value.trim();
    const username = document.getElementById('newUsername').value.trim();
    const emailInput = document.getElementById('newEmail').value.trim();
    const pass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const msgEl = document.getElementById('accountMsg');
    msgEl.style.color='black'; msgEl.innerText='Processing...';
    // Validation checks
    if(!fullName){ msgEl.style.color='red'; msgEl.innerText='Full Name লাগবে।'; return; }
    if(!username){ msgEl.style.color='red'; msgEl.innerText='Username লাগবে।'; return; }
    if(!emailInput){ msgEl.style.color='red'; msgEl.innerText='Gmail ঠিকানা দিতে হবে।'; return; }
    if(!isValidGmail(emailInput)){ msgEl.style.color='red'; msgEl.innerText='শুধু Gmail ঠিকানা গ্রহণ করা হয়।'; return; }
    if(!pass || !confirm){ msgEl.style.color='red'; msgEl.innerText='পাসওয়ার্ড ও কনফার্ম লাগবে।'; return; }
    if(pass !== confirm){ msgEl.style.color='red'; msgEl.innerText='পাসওয়ার্ড মেলেনি।'; return; }

    try{
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const userCred = await firebase.auth().createUserWithEmailAndPassword(emailInput, pass);
        await userCred.user.updateProfile({displayName: username});
        await firebase.database().ref('users/' + userCred.user.uid).set({
            username: username, email: emailInput, fullName: fullName, createdAt: new Date().toISOString()
        });
        cachedProfileInfo = {
            fullName: fullName,
            username: username,
            email: emailInput
        };
        msgEl.style.color='green'; msgEl.innerText='রেজিস্ট্রেশন সফল হয়েছে।';
        setTimeout(()=>{ document.getElementById('createAccountPage').style.display='none'; },800);
    }catch(e){
        console.error(e);
        msgEl.style.color='red';
        if(e.code === 'auth/email-already-in-use'){
            msgEl.innerText = 'এই Gmail আগে থেকেই নিবন্ধিত আছে।';
        } else {
            msgEl.innerText = 'Error: ' + (e.message || e.code);
        }
    }
}

// --- Log In User ---
window.loginUser = async function(){
    loginMsg.style.color='black'; loginMsg.innerText='Processing...';
    let emailOrUsername = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value;
    if(!emailOrUsername || !pass){ loginMsg.style.color='red'; loginMsg.innerText='Email/Username এবং Password লাগবে।'; return; }
    let email = emailOrUsername;
    // Attempt to infer email if a plain username is entered
    if(!email.includes('@')) {
        const san = emailOrUsername.replace(/\s+/g,'').toLowerCase();
        // Append @gmail.com as a fallback/assumption for username-based login (based on current auth method)
        email = (san || ('user'+Date.now())) + '@gmail.com';
    }
    try{
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        await firebase.auth().signInWithEmailAndPassword(email, pass);
        loginMsg.style.color='green'; loginMsg.innerText='লগইন সফল!';
        setTimeout(()=>{ closeAuthModal(); },700);
    }catch(err){
        console.error(err);
        loginMsg.style.color='red';
        if(err.code === 'auth/user-not-found') loginMsg.innerText='ইউজার পাওয়া যায়নি। আগে রেজিস্টার করো।';
        else if(err.code === 'auth/wrong-password') loginMsg.innerText='পাসওয়ার্ড ভুল।';
        else loginMsg.innerText = 'Error: ' + (err.message || err.code);
    }
}

// --- Log Out User ---
window.logoutUser = function(){
    firebase.auth().signOut().then(()=>{
        closeProfileModal();
    }).catch(e=>{
        alert('Logout error: ' + (e.message||e.code));
    });
}


/**
 * * =========================================
 * 👤 অংশ ৬: প্রোফাইল মোডাল লজিক
 * =========================================
 * * এই অংশে প্রোফাইল মোডাল খোলা ও বন্ধ করা এবং ব্যবহারকারীর তথ্য লোড করার লজিক রয়েছে।
 * */

window.openProfileModal = function() {
    const user = firebase.auth().currentUser;
    if (!user) {
        profileModalTitle.textContent = "Account";
        profileFields.style.display = "none";
        profileLoginOption.style.display = "flex";
    } else {
        profileModalTitle.textContent = "Profile Info";
        profileFields.style.display = "block";
        profileLoginOption.style.display = "none";
        
        // Use cached info if available
        if (cachedProfileInfo && cachedProfileInfo.fullName) {
            profileFullName.textContent = cachedProfileInfo.fullName;
            profileUserName.textContent = cachedProfileInfo.username || (user.displayName || "");
            profileEmail.textContent = cachedProfileInfo.email || (user.email || "");
        } else {
            // Fetch from Realtime DB if cache is empty
            const userId = user.uid;
            firebase.database().ref('users/' + userId).once('value').then(snap=>{
                let info = snap.val();
                profileFullName.textContent = (info && info.fullName) ? info.fullName : (user.displayName||user.email||"User");
                profileUserName.textContent = (info && info.username) ? info.username : (user.displayName||"");
                profileEmail.textContent = (info && info.email) ? info.email : (user.email||"");
                // Update cache
                cachedProfileInfo = {
                    fullName: (info && info.fullName) ? info.fullName : (user.displayName||user.email||"User"),
                    username: (info && info.username) ? info.username : (user.displayName||""),
                    email: (info && info.email) ? info.email : (user.email||"")
                };
            }).catch(()=>{
                // Fallback to Auth data
                profileFullName.textContent = user.displayName || user.email || "User";
                profileUserName.textContent = user.displayName || user.email || "";
                profileEmail.textContent = user.email || "";
            });
        }
    }
    profileModal.style.display="flex";
    profileModal.setAttribute('aria-hidden','false');
}
window.closeProfileModal = function() {
    profileModal.style.display="none";
    profileModal.setAttribute('aria-hidden','true');
}
profileModal.addEventListener('click', function(e){
    if(e.target === profileModal){ closeProfileModal(); }
});


/**
 * * =========================================
 * 🔄 অংশ ৭: Auth স্টেট লিসেনার
 * =========================================
 * * এই অংশে Firebase-এর `onAuthStateChanged` লিসেনার ব্যবহার করে লগইন/লগআউট স্টেট ট্র‍্যাক করা হয়েছে এবং UI আপডেট করা হয়েছে।
 * */

// Auth State Listener
firebase.auth().onAuthStateChanged(user=>{
    if(user){
        isLoggedIn = true;
        const userId = user.uid;
        // Fetch/Update profile data upon login
        firebase.database().ref('users/' + userId).once('value').then(snap=>{
            let info = snap.val();
            cachedProfileInfo = {
                fullName: (info && info.fullName) ? info.fullName : ((user.displayName) ? user.displayName : (user.email ? user.email.split('@')[0] : 'User')),
                username: (info && info.username) ? info.username : (user.displayName ? user.displayName : (user.email ? user.email.split('@')[0] : "")),
                email: (info && info.email) ? info.email : (user.email || "")
            };
            const label = document.getElementById('userLabel');
            if(label){
                label.textContent = cachedProfileInfo.fullName || cachedProfileInfo.username || '';
                // Hide name on small screens
                label.style.display = (window.innerWidth >= 980) ? 'inline-block' : 'none';
            }
            const btn = document.getElementById('profileBtn');
            if(btn && cachedProfileInfo.fullName){
                btn.title = (cachedProfileInfo.fullName + ' — Profile');
            }
        }).catch(()=>{
            // Fallback for cache if DB fetch fails
            cachedProfileInfo = {
                fullName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                username: user.displayName || (user.email ? user.email.split('@')[0] : ""),
                email: user.email || ""
            };
        });
    } else {
        isLoggedIn = false;
        cachedProfileInfo = {};
        closeProfileModal();
        const label = document.getElementById('userLabel');
        if(label) label.style.display = 'none';
    }
});


/**
 * * =========================================
 * 🛍️ অংশ ৮: প্রোডাক্ট এবং পেজ লজিক
 * =========================================
 * * এই অংশে পণ্য তালিকা রেন্ডার করা, পণ্যের বিস্তারিত পেজ দেখানো এবং পেজ নেভিগেশনের ফাংশনগুলো রয়েছে।
 * */

// Render products on the home page
function renderProducts(products){
    homeContainer.innerHTML='';
    products.forEach((p,i)=>{
        const d=document.createElement('div');
        d.className='product';
        d.onclick=()=>showProductPage(i, products);
        d.innerHTML=`<img src="${p.homeImg||'https://via.placeholder.com/400x300?text=No+Image'}" alt="${escapeHtml(p.name||'Product image')}"><div class="product-info"><h3>${escapeHtml(p.name||'Untitled')}</h3><p>${escapeHtml(p.price||'৳ 0')}</p></div>`;
        homeContainer.appendChild(d);
    });
}

// Show product detail page
function showProductPage(i, products){
    selectedProduct = products[i];
    document.getElementById('home').style.display='none';
    document.getElementById('productPage').style.display='block';
    if(header) header.style.display='none';
    document.getElementById('shopNameWrapper').style.display='none';
    document.getElementById('detailName').innerText=selectedProduct.name||'Product';
    document.getElementById('detailPrice').innerText=selectedProduct.price||'৳ 0';
    document.getElementById('productDescFrame').innerText=selectedProduct.desc||'';
    
    // Render product images
    const imagesCol = document.getElementById('detailImagesColumn');
    imagesCol.innerHTML='';
    const imageKeys = ['detailImg1','detailImg2','detailImg3','detailImg4'];
    imageKeys.forEach(key=>{
        if(selectedProduct[key]){
            const imgWrap=document.createElement('div');
            imgWrap.className='imgWrap';
            const imgEl=document.createElement('img');
            imgEl.src=selectedProduct[key];
            imgEl.alt = selectedProduct.name || 'Product detail';
            imgEl.onclick=()=>openFullscreen(selectedProduct[key]);
            imgWrap.appendChild(imgEl);
            imagesCol.appendChild(imgWrap);
        }
    });

    // Set order button action
    document.getElementById('orderBtn').onclick=(e)=>{
        e.preventDefault();
        if(!isLoggedIn){
            openOrderAlertModal();
            return;
        }
        openOrderForm();
    };
}

// Fullscreen image viewer
function openFullscreen(src){
    const div=document.createElement('div');
    div.className='fullscreen-view closeable';
    div.onclick=()=>div.remove();
    const img=document.createElement('img');
    img.src=src;
    div.appendChild(img);
    document.body.appendChild(div);
}

// Show order form
function openOrderForm(){
    document.getElementById('productPage').style.display='none';
    document.getElementById('orderFormPage').style.display='block';
    window.scrollTo({top:0,behavior:'smooth'});
}

// Back Button Navigation
window.goBack = function(currentPage){
    if(currentPage==='productPage'){
        document.getElementById('productPage').style.display='none';
        document.getElementById('home').style.display='grid';
        if(header) header.style.display='block';
        document.getElementById('shopNameWrapper').style.display='flex';
    } else if(currentPage==='orderFormPage'){
        document.getElementById('orderFormPage').style.display='none';
        document.getElementById('productPage').style.display='block';
        window.scrollTo({top:0,behavior:'smooth'});
    } else if(currentPage==='createAccountPage'){
        document.getElementById('createAccountPage').style.display='none';
    }
}


/**
 * * =========================================
 * 🛒 অংশ ৯: অর্ডার লজিক
 * =========================================
 * * এই অংশে অর্ডার নিশ্চিত করা, ব্যবহারকারীর অর্ডার দেখা এবং অর্ডার বাতিল করার লজিক রয়েছে।
 * */

// Confirm and submit order to Firebase
window.confirmOrder = function(){
    if(!isLoggedIn){
        openOrderAlertModal();
        return;
    }
    const last4=document.getElementById('lastFourDigits').value.trim();
    const uidInput=document.getElementById('userUID').value.trim();
    const msgEl=document.getElementById('orderMsg');

    // Validation
    if(last4.length!==4||isNaN(last4)){msgEl.style.color='red';msgEl.innerText='সঠিকভাবে শেষ ৪ ডিজিট দিন!';return;}
    if(uidInput===''){msgEl.style.color='red';msgEl.innerText='UID দিন!';return;}

    const currentUser = firebase.auth().currentUser;
    const uid = currentUser ? currentUser.uid : 'anonymous_' + Date.now();

    // Determine full name from cache/auth
    let fullNameValue = '';
    if(cachedProfileInfo && cachedProfileInfo.fullName){
        fullNameValue = cachedProfileInfo.fullName;
    } else if(currentUser && currentUser.displayName){
        fullNameValue = currentUser.displayName;
    } else if(currentUser && currentUser.email){
        fullNameValue = currentUser.email.split('@')[0];
    } else {
        fullNameValue = '';
    }

    const orderData={
        productName:selectedProduct?selectedProduct.name:'Unknown',
        productPrice:selectedProduct?selectedProduct.price:'৳ 0',
        lastFour:last4,
        "FF ID CODE":uidInput,
        time:new Date().toISOString(), 
        uid: uid, 
        status: 'pending', 
        fullName: fullNameValue
    };

    firebase.database().ref('orders').push(orderData).then(()=>{
        msgEl.style.color='green';msgEl.innerText='✅ অর্ডার সফলভাবে জমা হয়েছে!';
        document.getElementById('lastFourDigits').value='';
        document.getElementById('userUID').value='';
    }).catch(e=>{
        msgEl.style.color='red';
        msgEl.innerText='❌ সমস্যা হয়েছে, আবার চেষ্টা করুন!';
    });
}

// Show My Orders Modal and set up listeners
window.viewMyOrders = function(){
    const user = firebase.auth().currentUser;
    if(!user){
        closeProfileModal();
        setTimeout(()=>{ authModal.style.display='flex'; authModal.setAttribute('aria-hidden','false'); switchAuthTab('login'); }, 150);
        return;
    }

    closeProfileModal();

    myOrdersListEl.innerHTML = '<div class="myOrdersEmpty">লোড করা হচ্ছে...</div>';
    myOrdersModal.style.display = 'flex';
    myOrdersModal.setAttribute('aria-hidden','false');

    // Detach any previous listeners (Cleanup is vital)
    if(myOrdersQueryRef && myOrdersValueListener) {
        myOrdersQueryRef.off('value', myOrdersValueListener);
        myOrdersValueListener = null;
    }
    if(myOrdersQueryRef && myOrdersChildRemovedListener){
        myOrdersQueryRef.off('child_removed', myOrdersChildRemovedListener);
        myOrdersChildRemovedListener = null;
    }

    // Query orders for this user using Firebase query
    myOrdersQueryRef = firebase.database().ref('orders').orderByChild('uid').equalTo(user.uid);

    // Value listener: render the current set of orders (real-time)
    myOrdersValueListener = function(snap){
        const data = snap.val();
        myOrdersListEl.innerHTML = '';
        if(!data){
            myOrdersListEl.innerHTML = '<div class="myOrdersEmpty">কোনও অর্ডার পাওয়া যায়নি।</div>';
            return;
        }
        const entries = Object.entries(data);
        // Sort by ISO time (latest first)
        entries.sort((a,b)=>{
            const oa = a[1].time || '';
            const ob = b[1].time || '';
            const ta = Date.parse(oa) || 0;
            const tb = Date.parse(ob) || 0;
            return tb - ta;
        });

        entries.forEach(([key, order])=>{
            const div = document.createElement('div');
            div.className = 'orderItem';

            const left = document.createElement('div');
            left.className = 'left';
            left.innerHTML = `<strong>${escapeHtml(order.productName || 'Unknown')}</strong>
                              <div class="meta">Price: ${escapeHtml(order.productPrice || '')}</div>
                              <div class="meta">Time: ${new Date(order.time).toLocaleString() || ''}</div>
                              <div class="meta">Payment last4: ${escapeHtml(order.lastFour || '')}</div>
                              <div class="meta">Order ID: ${escapeHtml(key)}</div>`;

            // === robust status handling
            const rawStatusValue = order.status || order.Status || order.state || order.statusText || '';
            const rawStatus = String(rawStatusValue || 'pending').toLowerCase().trim();

            let label = 'Pending';
            let cls = 'pending';

            const acceptedVariants = ['accepted','success','successful','confirmed','confirm','approved','approve','ok','done'];
            const rejectedVariants = ['rejected','reject','failed','unsuccessful','cancelled','canceled','deleted','declined','denied'];

            if(acceptedVariants.indexOf(rawStatus) !== -1){
                label = 'Order Successful';
                cls = 'accepted';
            } else if(rejectedVariants.indexOf(rawStatus) !== -1){
                label = (rawStatus === 'cancelled' || rawStatus === 'canceled') ? 'Cancelled' : 'Order Unsuccessful';
                cls = 'rejected';
            } else {
                label = 'Pending';
                cls = 'pending';
            }

            // status + optional cancel button container
            const statusArea = document.createElement('div');
            statusArea.className = 'statusArea';

            const statusSpan = document.createElement('div');
            statusSpan.className = 'status ' + cls;
            statusSpan.innerText = label;
            statusArea.appendChild(statusSpan);

            // Add cancel button only when pending
            if(cls === 'pending'){
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'cancelBtn';
                cancelBtn.innerText = 'ক্যানসেল';
                cancelBtn.title = 'অর্ডার বাতিল করুন';
                cancelBtn.onclick = function(ev){
                    ev.stopPropagation();
                    cancelOrder(key, order, cancelBtn);
                };
                statusArea.appendChild(cancelBtn);
            }

            div.appendChild(left);
            div.appendChild(statusArea);
            myOrdersListEl.appendChild(div);
        });
    };

    myOrdersQueryRef.on('value', myOrdersValueListener);

    // child_removed listener: show a transient "Order Cancelled" note if admin deletes order
    myOrdersChildRemovedListener = function(snap){
        const removed = snap.val();
        if(!removed) return;
        if(removed.uid === user.uid){
            const cancelDiv = document.createElement('div');
            cancelDiv.className = 'orderItem';
            cancelDiv.style.background = 'linear-gradient(180deg,#fff8f9,#fff)';
            cancelDiv.innerHTML = `<div class="left"><strong>Order Cancelled</strong><div style="font-size:0.85em;color:#666;margin-top:6px;">Product: ${escapeHtml(removed.productName||'Unknown')}</div><div style="font-size:0.85em;color:#666;margin-top:4px;">Time: ${new Date(removed.time).toLocaleString() || ''}</div></div>
                                 <div class="status rejected">Cancelled</div>`;
            myOrdersListEl.insertBefore(cancelDiv, myOrdersListEl.firstChild);
            // Remove after 6 seconds for transient notification
            setTimeout(()=>{ if(cancelDiv && cancelDiv.parentNode) cancelDiv.parentNode.removeChild(cancelDiv); }, 6000);
        }
    };

    myOrdersQueryRef.on('child_removed', myOrdersChildRemovedListener);
}

// Close My Orders Modal and clean up listeners
window.closeMyOrdersModal = function(){
    myOrdersModal.style.display = 'none';
    myOrdersModal.setAttribute('aria-hidden','true');
    // Clean up realtime listeners
    if(myOrdersQueryRef && myOrdersValueListener){
        myOrdersQueryRef.off('value', myOrdersValueListener);
        myOrdersValueListener = null;
    }
    if(myOrdersQueryRef && myOrdersChildRemovedListener){
        myOrdersQueryRef.off('child_removed', myOrdersChildRemovedListener);
        myOrdersChildRemovedListener = null;
    }
    myOrdersQueryRef = null;
}

// Order cancellation logic
function cancelOrder(orderKey, orderObj, btnEl){
    if(!orderKey) return;
    const user = firebase.auth().currentUser;
    if(!user) { alert('অ্যাক্সেস নেই'); return; }
    
    // Authorization checks
    if(orderObj.uid !== user.uid){
        alert('এই অর্ডারটি আপনি বাতিল করতে পারবেন না।');
        return;
    }
    const currentStatus = (orderObj.status || 'pending').toString().toLowerCase();
    if(currentStatus !== 'pending'){
        alert('এই অর্ডারটি এখন আর বাতিলযোগ্য নয়।');
        return;
    }
    
    // Confirmation
    const ok = confirm('আপনি কি নিশ্চিত যে অর্ডারটি বাতিল করতে চান?');
    if(!ok) return;

    // UI Feedback
    if(btnEl){
        btnEl.disabled = true;
        btnEl.innerText = 'Processing...';
    }

    // Update status in Firebase
    const updates = { status: 'cancelled', cancelledAt: new Date().toISOString() };
    firebase.database().ref('orders/' + orderKey).update(updates).then(()=>{
        if(btnEl){ btnEl.innerText = 'Cancelled'; }
        // The realtime value listener handles the UI update
    }).catch(err=>{
        console.error(err);
        alert('বাতিল করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
        if(btnEl){ btnEl.disabled = false; btnEl.innerText = 'ক্যানসেল'; }
    });
}


/**
 * * =========================================
 * 🔗 অংশ ১০: রুট ডেটাবেস লিসেনার এবং কপি ফাংশন
 * =========================================
 * * এই অংশে পুরো ডেটাবেস থেকে শপের নাম, হেডার টেক্সট এবং প্রোডাক্ট লোড করার লজিক রয়েছে।
 * */

/*
  Listener for full DB to update product list & shopName (Initial Data Load)
*/
dbRef.on('value', snap=>{
    const data=snap.val();
    if(!data)return;
    if(data.shopName)shopNameDiv.innerText=data.shopName;
    if(data.headerText && header) header.innerText=data.headerText;
    if(data.products)renderProducts(Object.values(data.products));
});


// Copy Function (for easy copying of data like Order ID or transaction details)
window.copyText = function(elementId){
    const el = document.getElementById(elementId);
    if(!el) return;
    const text = el.innerText;
    
    // Modern Clipboard API
    if(!navigator.clipboard) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    } else {
        navigator.clipboard.writeText(text).catch(()=>{ /* ignore */ });
    }
    
    // Show transient feedback on the nearby button
    const btns = document.querySelectorAll('.copyBtn');
    btns.forEach(btn=>{
        const targetId = btn.getAttribute('data-target') || (btn.previousElementSibling ? btn.previousElementSibling.id : null);
        if(targetId === elementId){
            const originalText = btn.innerText;
            btn.innerText = 'Copied ✅';
            setTimeout(()=>{btn.innerText = originalText;},1200);
        }
    });
}