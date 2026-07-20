/* ==========================================================================
   KSP AI-DRIVEN CRIME ANALYTICS & VISUALIZATION PLATFORM - CORE SCRIPT
   ========================================================================== */

// --- Global Data Stores ---
let crimeRecords = [];
let repeatOffenders = [];
let alertFeed = [];
let networkData = { nodes: [], links: [] };
let activeView = 'dashboard';
let gisMap = null;
let miniMap = null;
let mapMarkersGroup = null;
let mapCirclesGroup = null;

// --- Chart Instances (to destroy and rebuild on theme shifts/data resets) ---
let charts = {};

// --- Network Graph State ---
let networkState = {
    zoom: 1.0,
    offsetX: 0,
    offsetY: 0,
    draggedNode: null,
    hoveredNode: null,
    isDraggingCanvas: false,
    dragStartX: 0,
    dragStartY: 0,
    simulationActive: true,
    hiddenScanRunning: false
};

// --- Target Karnataka Districts center coordinates ---
const DISTRICTS_GEO = {
    "Bengaluru Urban": { lat: 12.9716, lng: 77.5946, risk: "High", crimes: 4521, alerts: 14 },
    "Mysuru": { lat: 12.2958, lng: 76.6394, risk: "High", crimes: 1845, alerts: 8 },
    "Belagavi": { lat: 15.8497, lng: 74.4977, risk: "High", crimes: 1420, alerts: 5 },
    "Kalaburagi": { lat: 17.3297, lng: 76.8343, risk: "Medium", crimes: 980, alerts: 3 },
    "Hubballi-Dharwad": { lat: 15.3647, lng: 75.1240, risk: "Medium", crimes: 1210, alerts: 4 },
    "Mangaluru": { lat: 12.9141, lng: 74.8560, risk: "High", crimes: 1102, alerts: 6 },
    "Shivamogga": { lat: 13.9299, lng: 75.5681, risk: "Medium", crimes: 745, alerts: 2 },
    "Davanagere": { lat: 14.4644, lng: 75.9218, risk: "Low", crimes: 430, alerts: 1 },
    "Ballari": { lat: 15.1394, lng: 76.9214, risk: "Medium", crimes: 852, alerts: 2 },
    "Tumakuru": { lat: 13.3392, lng: 77.1140, risk: "Low", crimes: 580, alerts: 1 },
    "Kolar": { lat: 13.1368, lng: 78.1292, risk: "Medium", crimes: 610, alerts: 3 },
    "Bidar": { lat: 17.9104, lng: 77.5199, risk: "Medium", crimes: 480, alerts: 1 },
    "Raichur": { lat: 16.2120, lng: 77.3556, risk: "Low", crimes: 390, alerts: 0 },
    "Udupi": { lat: 13.3409, lng: 74.7421, risk: "Low", crimes: 412, alerts: 1 },
    "Hassan": { lat: 13.0068, lng: 76.1026, risk: "Medium", crimes: 590, alerts: 2 }
};

const CRIME_CATEGORIES = ["Cybercrime", "Burglary", "Assault", "Narcotics", "Robbery", "Financial Fraud", "Vehicle Theft"];
const MOCK_MUGSHOTS = [
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%2312355B'/><circle cx='50' cy='35' r='20' fill='%238B949E'/><path d='M20 85 C 20 60, 80 60, 80 85 Z' fill='%238B949E'/><circle cx='43' cy='32' r='2' fill='%230D1117'/><circle cx='57' cy='32' r='2' fill='%230D1117'/><line x1='40' y1='25' x2='48' y2='28' stroke='%23FF3B30' stroke-width='2'/><line x1='60' y1='25' x2='52' y2='28' stroke='%23FF3B30' stroke-width='2'/></svg>",
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%230B1F3A'/><circle cx='50' cy='35' r='18' fill='%238B949E'/><path d='M25 85 C 25 65, 75 65, 75 85 Z' fill='%238B949E'/><circle cx='45' cy='33' r='2' fill='%230D1117'/><circle cx='55' cy='33' r='2' fill='%230D1117'/><path d='M46 42 Q 50 45 54 42' stroke='%23FF3B30' stroke-width='1.5' fill='none'/></svg>",
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%230A0F17'/><circle cx='50' cy='35' r='19' fill='%238B949E'/><path d='M22 85 C 22 62, 78 62, 78 85 Z' fill='%238B949E'/><circle cx='44' cy='34' r='2' fill='%2300C8FF'/><circle cx='56' cy='34' r='2' fill='%2300C8FF'/><rect x='38' y='46' width='24' height='4' rx='2' fill='%23FF3B30'/></svg>"
];

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    updateClock();
    setInterval(updateClock, 1000);
    
    // Generate Mock Database
    generateMockDatabase();
    
    // Initialize UI Component Handlers
    initNavigation();
    initFilters();
    initSearch();
    initQuickAlerts();
    initNotificationCenter();
    
    // Default Page Load (Dashboard)
    loadDashboardView();
    
    // Quick Floating Chat listeners
    document.getElementById("float-user-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendFloatingChatMessage();
    });
    document.getElementById("chat-user-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const val = e.target.value;
            e.target.value = '';
            askChatAssistant(val);
        }
    });
    document.getElementById("btn-chat-send").addEventListener("click", () => {
        const inp = document.getElementById("chat-user-input");
        const val = inp.value;
        inp.value = '';
        askChatAssistant(val);
    });

    // Custom configuration range updates
    const confThreshRange = document.getElementById("set-confidence-threshold");
    if(confThreshRange) {
        confThreshRange.addEventListener("input", (e) => {
            document.getElementById("confidence-range-val").innerText = e.target.value + "%";
        });
    }

    // Toggle search clear button visibility
    const searchInput = document.getElementById("global-search-input");
    const clearBtn = document.getElementById("search-clear");
    searchInput.addEventListener("input", (e) => {
        clearBtn.style.display = e.target.value ? "block" : "none";
    });
    clearBtn.addEventListener("click", () => {
        searchInput.value = '';
        clearBtn.style.display = "none";
        document.getElementById("search-dropdown-results").style.display = "none";
    });
});

// --- System Telemetries: Live Clock ---
function updateClock() {
    const clock = document.getElementById("clock-display");
    if (clock) {
        const now = new Date();
        clock.innerText = now.toLocaleTimeString('en-US', { hour12: true });
    }
}

// --- Navigation Controller ---
function initNavigation() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("toggle-sidebar");
    
    // Sidebar Collapse
    toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        // Reflow maps and graphs when size changes
        setTimeout(() => {
            if (gisMap) gisMap.invalidateSize();
            if (miniMap) miniMap.invalidateSize();
        }, 300);
    });

    // Menu Item Clicking
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetView = item.getAttribute("data-view");
            navigateToView(targetView);
            
            // Close mobile active sidebar
            sidebar.classList.remove("mobile-active");
        });
    });

    // View All Alerts link inside notifications dropdown
    const viewAllAlerts = document.getElementById("view-all-alerts-link");
    if (viewAllAlerts) {
        viewAllAlerts.addEventListener("click", (e) => {
            e.preventDefault();
            navigateToView('alerts');
        });
    }
}

function navigateToView(viewId) {
    activeView = viewId;
    
    // Update navigation active class
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        if (item.getAttribute("data-view") === viewId) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Hide all view panels and show the target panel
    const viewPanels = document.querySelectorAll(".view-panel");
    viewPanels.forEach(panel => {
        panel.classList.remove("active");
    });

    // Translate view codes to HTML panel IDs
    let htmlId = "view-" + viewId;
    const targetPanel = document.getElementById(htmlId);
    if (targetPanel) {
        targetPanel.classList.add("active");
    }

    // Trigger specific page initializations/draws
    if (viewId === "dashboard") {
        loadDashboardView();
    } else if (viewId === "records") {
        loadRecordsView();
    } else if (viewId === "map-view") {
        loadGISMapView();
    } else if (viewId === "network") {
        loadNetworkGraphView();
    } else if (viewId === "predictive") {
        loadPredictiveView();
    } else if (viewId === "offenders") {
        loadRepeatOffendersView();
    } else if (viewId === "reports") {
        loadReportsView();
    } else if (viewId === "alerts") {
        loadAlertsCenterView();
    }
}

// --- Data Generator Engine (100+ Procedural Incidents) ---
function generateMockDatabase() {
    const offenderNames = [
        "Vikram Gowda", "Rahul Sharma", "Karan Shetty", "Munna Bhai", "Sandeep Hegde", 
        "Anil Kumar", "Suresh Naik", "Karthik R.", "Mohan Raju", "Vijay Patil",
        "Deepak Gowda", "Prashanth M.", "Basavaraj S.", "Harish Prasad", "Santosh Nayak"
    ];
    
    const MOs = [
        "Armed vault burglary targeting gold bank lockers during mid-week hours.",
        "Phishing attacks posing as KSEB electricity bills, scamming rural consumers.",
        "Night-time house break-ins of locked villas in wealthy residential sectors.",
        "Inter-state narcotics supply syndicate bypassing highway checkposts using logistics containers.",
        "Corporate invoice manipulation and banking wire diversion targeting tech companies.",
        "Vehicle theft racket involving keyless high-end SUVs, moving them to neighboring states."
    ];

    const policeStations = {
        "Bengaluru Urban": ["Koramangala PS", "Indiranagar PS", "Whitefield PS", "Jayanagar PS"],
        "Mysuru": ["Devaraja PS", "Lashkar PS", "K.R. Puram PS"],
        "Belagavi": ["Market PS", "Khade Bazar PS", "Camp PS"],
        "Kalaburagi": ["Chowk PS", "Station Bazar PS"],
        "Hubballi-Dharwad": ["Gokul Road PS", "Suburban PS"],
        "Mangaluru": ["Kadir PS", "Urwa PS", "Pandeshwar PS"],
        "Shivamogga": ["Kote PS", "Tunga PS"],
        "Davanagere": ["Extension PS", "Gandhinagar PS"],
        "Ballari": ["Brucepet PS", "Gandhinagar PS"],
        "Tumakuru": ["Kyathasandra PS", "Town PS"],
        "Kolar": ["Town PS", "Galipet PS"],
        "Bidar": ["Gandhi Gunj PS", "Market PS"],
        "Raichur": ["West PS", "Market PS"],
        "Udupi": ["Town PS", "Manipal PS"],
        "Hassan": ["Extension PS", "Pension Lane PS"]
    };

    // Generate Repeat Offenders Profiles first (e.g. 5 primary files)
    repeatOffenders = [
        {
            id: "KSP-CR-9912",
            name: "Vikram \"Vicky\" Gowda",
            age: 38,
            gender: "Male",
            district: "Bengaluru Rural",
            modusOperandi: "Night-time bank locker heist using precision gas cutters.",
            weapons: ["Gas Cutters", "Sharp Blades"],
            convictions: 8,
            recidivismScore: 94,
            status: "Wanted / Active",
            photo: MOCK_MUGSHOTS[0],
            aliases: "Vicky, Gas-cutter Vikram",
            linkedAssociates: ["Rahul Sharma (KSP-CR-9921)", "Anil Kumar (KSP-CR-9935)"],
            aiSummary: "High recidivism risk. Subject specializes in cutting vault grills. Chronological tracking shows he operates primarily inside Bengaluru Rural boundaries, but has recently been associated with robberies in Kolar. Recommended surveillance at border industrial units.",
            timeline: [
                { date: "12 May 2026", title: "Locker Burglary Brief", desc: "Gold ornaments worth 45 lakhs stolen in Devanahalli bank. Gas cutters detected." },
                { date: "18 Nov 2025", title: "Possession of Illegal Arms", desc: "Apprehended on highway checkpost with sharp military knives. Released on bail." },
                { date: "04 Feb 2024", title: "Jewelry Store Vault Heist", desc: "Convicted for robbery in Tumakuru town. Served 18 months." },
                { date: "09 Aug 2022", title: "Commercial Break-in", desc: "Targeted cooperative society vault in Doddaballapura. Sentenced to 12 months." }
            ]
        },
        {
            id: "KSP-CR-9921",
            name: "Rahul Sharma",
            age: 34,
            gender: "Male",
            district: "Bengaluru Urban",
            modusOperandi: "Phishing emails and duplicate banking portals.",
            weapons: ["Digital Malware", "Sim Cloners"],
            convictions: 3,
            recidivismScore: 84,
            status: "Arrested / In Custody",
            photo: MOCK_MUGSHOTS[1],
            aliases: "Malware Rahul, ByteCoder",
            linkedAssociates: ["Vikram Gowda (KSP-CR-9912)", "Karthik R. (KSP-CR-9988)"],
            aiSummary: "Highly technical individual. Intercepts payment APIs for middle-market logistics companies. Primarily works online but coordinates cash withdrawers in Hubballi and Mysuru. Moderate threat of digital escape.",
            timeline: [
                { date: "22 Jun 2026", title: "Phishing Hub Alert", desc: "Arrested in Jayanagar hideout. 54 active spoofed electricity bill portals seized." },
                { date: "15 Jan 2025", title: "Wire Divergence Scam", desc: "Indicted for spoofing merchant bank transactions worth 2.4 crores. Bailed out." },
                { date: "11 Sep 2023", title: "Identity Theft", desc: "Convicted of cloning over 200 phone numbers. Fined 5 lakhs and jail time." }
            ]
        },
        {
            id: "KSP-CR-9935",
            name: "Anil Kumar",
            age: 41,
            gender: "Male",
            district: "Mysuru",
            modusOperandi: "Inter-district highway transport of bulk narcotics.",
            weapons: ["Firearm (Desi Pistol)"],
            convictions: 5,
            recidivismScore: 78,
            status: "Wanted / Active",
            photo: MOCK_MUGSHOTS[2],
            aliases: "Highway Anil, Brownie",
            linkedAssociates: ["Vikram Gowda (KSP-CR-9912)"],
            aiSummary: "Coordinates freight trucking routes across Maharashtra-Karnataka borders. High likelihood of armed resistance during tactical boarding. Known contacts in Belagavi and Hubballi logistics hubs.",
            timeline: [
                { date: "04 Jul 2026", title: "Narcotics Seizure", desc: "Fled checkpoint near Belagavi border. Left container containing 120kg cannabis behind." },
                { date: "12 Oct 2024", title: "Armed Assault on Patrol", desc: "Fired at rural police vehicle during routine check in Mandya. Evaded arrest." },
                { date: "05 Mar 2023", title: "Smuggling Conviction", desc: "Convicted for transporting banned pharmaceutical shipments. Served 2 years." }
            ]
        }
    ];

    // Generate 120 Procedural Crime Incident Records
    let now = new Date();
    for (let i = 1; i <= 120; i++) {
        // District selection
        const districts = Object.keys(DISTRICTS_GEO);
        const district = districts[i % districts.length];
        
        // Police station list based on district
        const stations = policeStations[district] || ["Central PS"];
        const station = stations[i % stations.length];

        // Crime Type
        const crimeType = CRIME_CATEGORIES[i % CRIME_CATEGORIES.length];

        // Criminal Assignment
        let criminalId = "N/A";
        let criminalName = "Unknown / Unidentified";
        let score = 0;
        let isRepeat = false;

        if (i % 3 === 0) {
            const offender = repeatOffenders[i % repeatOffenders.length];
            criminalId = offender.id;
            criminalName = offender.name;
            score = offender.recidivismScore;
            isRepeat = true;
        } else if (i % 2 === 0) {
            const rIdx = i % offenderNames.length;
            criminalId = `KSP-CR-99${80 - rIdx}`;
            criminalName = offenderNames[rIdx];
            score = Math.floor(Math.random() * 40) + 40; // 40-80
        }

        // Date Calculation (Past 6 months)
        let eventDate = new Date();
        eventDate.setDate(now.getDate() - (i * 1.5));
        eventDate.setHours(eventDate.getHours() - (i % 24));
        eventDate.setMinutes(eventDate.getMinutes() - (i % 60));

        // Weapon
        let weapon = "None";
        if (crimeType === "Assault" || crimeType === "Robbery") {
            weapon = i % 2 === 0 ? "Sharp Weapon" : "Firearm";
        } else if (crimeType === "Burglary") {
            weapon = "Iron Crowbar / Lock Pick";
        } else if (crimeType === "Cybercrime" || crimeType === "Financial Fraud") {
            weapon = "Digital Malware";
        }

        // Severity
        let severity = "Medium";
        if (weapon === "Firearm" || crimeType === "Narcotics" || i % 6 === 0) {
            severity = "High";
        } else if (i % 5 === 0) {
            severity = "Low";
        }

        // Status
        let status = "Under Investigation";
        if (i % 3 === 1) {
            status = "Solved";
        } else if (i % 5 === 2) {
            status = "Arrested";
        } else if (i % 12 === 0) {
            status = "Cold Case";
        }

        crimeRecords.push({
            firNumber: `FIR-2026-${district.replace(/\s+/g, '')}-${1000 + i}`,
            criminalId: criminalId,
            offenderName: criminalName,
            crimeType: crimeType,
            district: district,
            policeStation: station,
            dateTime: eventDate,
            weapon: weapon,
            severity: severity,
            status: status,
            recidivismScore: score,
            isRepeatOffender: isRepeat,
            mo: MOs[i % MOs.length]
        });
    }

    // Generate Alerts list
    alertFeed = [
        {
            id: "alt-001",
            type: "critical",
            title: "🔴 High Risk Alert: Border Checkpost Violation",
            desc: "Suspicious logistics container bypassed checkpost near Belagavi. Potential narcotics shipment links.",
            timestamp: "10 mins ago",
            district: "Belagavi",
            confidence: 94
        },
        {
            id: "alt-002",
            type: "warning",
            title: "🟠 Crime Spike: Cyber Phishing Waves",
            desc: "Sudden 28% increase in spoofed utility websites targeting Mysuru Rural consumers.",
            timestamp: "1 hour ago",
            district: "Mysuru",
            confidence: 88
        },
        {
            id: "alt-003",
            type: "offender",
            title: "🟡 Repeat Offender Active: Vikram Gowda spotted",
            desc: "Biometric matches from surveillance cameras in Tumakuru hardware blocks indicate search for vault tools.",
            timestamp: "3 hours ago",
            district: "Tumakuru",
            confidence: 91
        },
        {
            id: "alt-004",
            type: "update",
            title: "🔵 Case File Updated: FIR-2026-Bengaluru-1024",
            desc: "Forensics report uploaded. Malware signature traces back to known digital wallet rings in Hyderabad.",
            timestamp: "5 hours ago",
            district: "Bengaluru Urban",
            confidence: 96
        }
    ];

    // Generate Network Node and Link Map
    generateNetworkGraphData();
}

function generateNetworkGraphData() {
    // We want to create nodes representing suspects, locations, vehicles, weapons, and phones
    // Let's create primary nodes from our repeat offenders
    let nodes = [];
    let links = [];

    // Add Suspects
    repeatOffenders.forEach((o, idx) => {
        nodes.push({
            id: o.id,
            label: o.name,
            type: 'suspect',
            val: 20,
            score: o.recidivismScore,
            metadata: { convictions: o.convictions, status: o.status, mo: o.modusOperandi }
        });
    });

    // Add other suspects
    nodes.push({ id: "KSP-CR-9988", label: "Karthik R.", type: 'suspect', val: 12, score: 72, metadata: { convictions: 2, status: "Wanted", mo: "Card skimming" } });
    nodes.push({ id: "KSP-CR-9954", label: "Sandeep Hegde", type: 'suspect', val: 14, score: 65, metadata: { convictions: 3, status: "Bailed", mo: "Vehicle hijack" } });

    // Add Locations
    nodes.push({ id: "loc-blr-east", label: "Whitefield precinct", type: 'location', val: 10 });
    nodes.push({ id: "loc-mys-cbd", label: "Devaraja market", type: 'location', val: 10 });
    nodes.push({ id: "loc-bel-border", label: "Belagavi NH-48", type: 'location', val: 10 });

    // Add Vehicles
    nodes.push({ id: "veh-ka03my9942", label: "SUV KA-03-MY-9942", type: 'vehicle', val: 8 });
    nodes.push({ id: "veh-ka55dd2012", label: "Truck KA-55-DD-2012", type: 'vehicle', val: 8 });

    // Add Weapons
    nodes.push({ id: "weap-gascutter", label: "Gas Cutters", type: 'weapon', val: 8 });
    nodes.push({ id: "weap-pistol", label: "Country Pistol", type: 'weapon', val: 8 });
    nodes.push({ id: "weap-malware", label: "PhishBot.v4", type: 'weapon', val: 8 });

    // Add Mobiles
    nodes.push({ id: "mob-882201441", label: "+91 98822 01441", type: 'mobile', val: 7 });
    nodes.push({ id: "mob-774001994", label: "+91 97740 01994", type: 'mobile', val: 7 });

    // Add Bank Accounts
    nodes.push({ id: "bank-ksp9942", label: "SBI A/C ...9942", type: 'bank', val: 7 });

    // Connect them
    // Vikram Gowda connects
    links.push({ source: "KSP-CR-9912", target: "weap-gascutter", label: "Possesses" });
    links.push({ source: "KSP-CR-9912", target: "loc-blr-east", label: "Operates in" });
    links.push({ source: "KSP-CR-9912", target: "veh-ka03my9942", label: "Drives" });
    links.push({ source: "KSP-CR-9912", target: "mob-882201441", label: "Registered phone" });

    // Rahul Sharma connects
    links.push({ source: "KSP-CR-9921", target: "weap-malware", label: "Compiles" });
    links.push({ source: "KSP-CR-9921", target: "mob-774001994", label: "Uses phone" });
    links.push({ source: "KSP-CR-9921", target: "bank-ksp9942", label: "Hacks/Transfer to" });
    links.push({ source: "KSP-CR-9921", target: "loc-blr-east", label: "Arrested in" });

    // Anil Kumar connects
    links.push({ source: "KSP-CR-9935", target: "weap-pistol", label: "Carries" });
    links.push({ source: "KSP-CR-9935", target: "veh-ka55dd2012", label: "Smuggles via" });
    links.push({ source: "KSP-CR-9935", target: "loc-bel-border", label: "Fled scene" });

    // Cross links (Criminal Associations)
    links.push({ source: "KSP-CR-9912", target: "KSP-CR-9921", label: "Complicit (Heist coordination)", style: "solid" });
    links.push({ source: "KSP-CR-9912", target: "KSP-CR-9935", label: "Supplied weapons to", style: "solid" });
    links.push({ source: "KSP-CR-9921", target: "KSP-CR-9988", label: "Cloned identities for", style: "solid" });
    links.push({ source: "KSP-CR-9912", target: "loc-mys-cbd", label: "Spotted in" });
    links.push({ source: "KSP-CR-9935", target: "loc-mys-cbd", label: "Sells goods in" });

    // Positioning layout coordinate anchors
    nodes.forEach(n => {
        n.x = Math.random() * 500 + 150;
        n.y = Math.random() * 300 + 100;
        n.vx = 0;
        n.vy = 0;
    });

    networkData = { nodes, links };
}

// --- 1. Load Dashboard View ---
function loadDashboardView() {
    // Fill Live Anomaly Alerts list
    const anomaliesBox = document.getElementById("dashboard-anomalies");
    if (anomaliesBox) {
        anomaliesBox.innerHTML = '';
        const recentAnomalies = [
            {
                title: "🚨 Unusual Burglary Pattern - Bengaluru East",
                desc: "Three lock-picks reported within 400m radius using identical cylinder-pulling technique.",
                time: "Today, 08:30 AM",
                conf: "92%",
                type: "critical"
            },
            {
                title: "⚠️ Suspicious Repeat Mobile Activity - Mysuru Hub",
                desc: "SIM cloner linked to KSP-CR-9921 activated twice near Mysuru Rural checkpoints.",
                time: "Today, 06:12 AM",
                conf: "84%",
                type: "warning"
            },
            {
                title: "⚠️ Unexpected Cyber Spike - Hubballi-Dharwad",
                desc: "400% surge in crypto wallet transfer anomalies targeting senior citizens.",
                time: "Yesterday, 22:45 PM",
                conf: "89%",
                type: "warning"
            }
        ];
        
        recentAnomalies.forEach(a => {
            const div = document.createElement("div");
            div.className = `anomaly-alert-card ${a.type === 'warning' ? 'warning-edge' : ''}`;
            div.innerHTML = `
                <div class="anomaly-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="anomaly-content">
                    <h4>${a.title}</h4>
                    <p>${a.desc}</p>
                    <div class="anomaly-meta">
                        <span class="font-telemetry">${a.time}</span>
                        <span class="badge-confidence font-telemetry">AI Conf: ${a.conf}</span>
                    </div>
                </div>
            `;
            anomaliesBox.appendChild(div);
        });
    }

    // Load Charts
    buildDashboardCharts();
    
    // Load Mini GIS Map (Leaflet)
    buildMiniGISMap();
}

function buildDashboardCharts() {
    // Destroy previous charts if they exist
    Object.keys(charts).forEach(key => {
        if(charts[key]) charts[key].destroy();
    });

    // Color definitions
    const accentColor = '#00C8FF';
    const alertColor = '#FF3B30';
    const successColor = '#2ECC71';
    const warningColor = '#FFA500';
    const textMainColor = '#F3F4F6';
    const gridLineColor = 'rgba(255, 255, 255, 0.05)';

    // Chart Options Base
    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: textMainColor,
                    font: { family: 'Poppins', size: 10 }
                }
            }
        },
        scales: {
            x: {
                grid: { color: gridLineColor },
                ticks: { color: textMainColor, font: { family: 'Orbitron', size: 9 } }
            },
            y: {
                grid: { color: gridLineColor },
                ticks: { color: textMainColor, font: { family: 'Orbitron', size: 9 } }
            }
        }
    };

    // Chart 1: Monthly Trends (Line Chart)
    const ctx1 = document.getElementById("chart-monthly-trends").getContext("2d");
    const gradient = ctx1.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(0, 200, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 200, 255, 0)');
    
    charts.monthlyTrends = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
                label: 'State Crime Volume',
                data: [11540, 11820, 12102, 11980, 12245, 12390, 12548],
                borderColor: accentColor,
                borderWidth: 2,
                fill: true,
                backgroundColor: gradient,
                tension: 0.3,
                pointBackgroundColor: accentColor
            }]
        },
        options: baseOptions
    });

    // Chart 2: Crimes by District (Bar Chart)
    const ctx2 = document.getElementById("chart-district-crimes").getContext("2d");
    charts.districtCrimes = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Blr Urban', 'Mysuru', 'Belagavi', 'Hubli-Dh', 'Mangaluru', 'Shivamogga'],
            datasets: [{
                label: 'Incident Count',
                data: [4521, 1845, 1420, 1210, 1102, 745],
                backgroundColor: 'rgba(18, 53, 91, 0.7)',
                borderColor: accentColor,
                borderWidth: 1,
                hoverBackgroundColor: accentColor
            }]
        },
        options: baseOptions
    });

    // Chart 3: Category Distribution (Doughnut)
    const ctx3 = document.getElementById("chart-category-distribution").getContext("2d");
    charts.categoryDist = new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: ['Cybercrime', 'Burglary', 'Assault', 'Narcotics', 'Robbery', 'Fraud', 'Theft'],
            datasets: [{
                data: [32, 22, 15, 11, 8, 7, 5],
                backgroundColor: [
                    accentColor, '#9B59B6', alertColor, warningColor, '#1ABC9C', '#3498DB', '#34495E'
                ],
                borderWidth: 1,
                borderColor: '#0D1117'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: textMainColor, font: { family: 'Poppins', size: 9 } }
                }
            }
        }
    });

    // Chart 4: Time of Day Temporal Wave (Area Chart)
    const ctx4 = document.getElementById("chart-temporal-wave").getContext("2d");
    const gradientTemporal = ctx4.createLinearGradient(0, 0, 0, 200);
    gradientTemporal.addColorStop(0, 'rgba(255, 59, 48, 0.3)');
    gradientTemporal.addColorStop(1, 'rgba(255, 59, 48, 0)');
    
    charts.temporalWave = new Chart(ctx4, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [{
                label: 'Crime Probability',
                data: [68, 85, 34, 45, 52, 79],
                borderColor: alertColor,
                borderWidth: 2,
                fill: true,
                backgroundColor: gradientTemporal,
                tension: 0.4,
                pointBackgroundColor: alertColor
            }]
        },
        options: baseOptions
    });

    // Chart 5: Arrest Clearance (Stacked Bar)
    const ctx5 = document.getElementById("chart-arrest-clearance").getContext("2d");
    charts.arrestClearance = new Chart(ctx5, {
        type: 'bar',
        data: {
            labels: ['Cyber', 'Burglary', 'Assault', 'Narcotics', 'Robbery', 'Fraud'],
            datasets: [
                {
                    label: 'Arrests Made',
                    data: [15, 45, 80, 92, 60, 40],
                    backgroundColor: successColor
                },
                {
                    label: 'Unsolved Cases',
                    data: [85, 55, 20, 8, 40, 60],
                    backgroundColor: 'rgba(255,255,255,0.05)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textMainColor, font: { family: 'Poppins', size: 10 } } }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: gridLineColor },
                    ticks: { color: textMainColor, font: { family: 'Poppins', size: 9 } }
                },
                y: {
                    stacked: true,
                    max: 100,
                    grid: { color: gridLineColor },
                    ticks: { color: textMainColor, font: { family: 'Orbitron', size: 9 } }
                }
            }
        }
    });
}

function buildMiniGISMap() {
    // If map already exists, clear it
    if (miniMap) {
        miniMap.remove();
    }
    
    miniMap = L.map('mini-crime-map', {
        center: [12.9716, 77.5946], // Bengaluru
        zoom: 9,
        zoomControl: false,
        attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
    }).addTo(miniMap);

    // Place marker for Bengaluru police headquarters
    L.circleMarker([12.9716, 77.5946], {
        radius: 12,
        fillColor: '#FF3B30',
        color: '#FF3B30',
        weight: 1,
        fillOpacity: 0.4
    }).addTo(miniMap);

    L.circleMarker([12.9716, 77.5946], {
        radius: 20,
        fillColor: 'transparent',
        color: '#FF3B30',
        weight: 1.5,
        className: 'pulsing-district-ring'
    }).addTo(miniMap);
}

// --- 2. Load Crime Records View ---
function loadRecordsView() {
    const tbody = document.getElementById("fir-records-tbody");
    tbody.innerHTML = '';
    
    document.getElementById("records-total-count").innerText = crimeRecords.length;
    
    // Fill the table with records
    renderRecordsTable(crimeRecords);
}

function renderRecordsTable(records) {
    const tbody = document.getElementById("fir-records-tbody");
    tbody.innerHTML = '';
    
    document.getElementById("records-visible-count").innerText = records.length;

    records.forEach(r => {
        const tr = document.createElement("tr");
        
        let severityBadge = '';
        if(r.severity === 'High') severityBadge = `<span class="badge-table badge-severity-high">High (L3)</span>`;
        else if(r.severity === 'Medium') severityBadge = `<span class="badge-table badge-severity-medium">Medium (L2)</span>`;
        else severityBadge = `<span class="badge-table badge-severity-low">Low (L1)</span>`;

        let statusBadge = '';
        if(r.status === 'Solved') statusBadge = `<span class="badge-table badge-status-solved">Closed / Solved</span>`;
        else if(r.status === 'Under Investigation') statusBadge = `<span class="badge-table badge-status-investigation">In Progress</span>`;
        else if(r.status === 'Arrested') statusBadge = `<span class="badge-table badge-status-arrested">Arrested</span>`;
        else statusBadge = `<span class="badge-table badge-status-cold">Cold Case</span>`;

        let recidivismGlow = r.isRepeatOffender ? `<span class="alert-text font-bold" title="Known Repeat Offender! Recidivism risk: ${r.recidivismScore}%"><i class="fa-solid fa-users-viewfinder"></i> ${r.offenderName}</span>` : r.offenderName;

        tr.innerHTML = `
            <td class="font-telemetry cyan-text font-bold">${r.firNumber}</td>
            <td class="font-telemetry">${r.criminalId !== 'N/A' ? r.criminalId : `<span class="opacity-5">N/A</span>`}</td>
            <td>${recidivismGlow}</td>
            <td>${r.crimeType}</td>
            <td>${r.district}</td>
            <td>${r.policeStation}</td>
            <td class="font-telemetry">${r.dateTime.toLocaleDateString()} ${r.dateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            <td>${r.weapon}</td>
            <td>${severityBadge}</td>
            <td>${statusBadge}</td>
            <td class="actions-col">
                <button class="btn btn-secondary btn-sm" onclick="inspectIncident('${r.firNumber}')"><i class="fa-solid fa-expand"></i> Inspect</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function initFilters() {
    const districtSelect = document.getElementById("filter-district");
    const stationSelect = document.getElementById("filter-station");
    
    // Fill District options
    Object.keys(DISTRICTS_GEO).sort().forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.innerText = d;
        districtSelect.appendChild(opt);
    });

    // Populate police station when district changes
    districtSelect.addEventListener("change", (e) => {
        const selected = e.target.value;
        stationSelect.innerHTML = '<option value="all">All Stations</option>';
        
        if (selected !== 'all') {
            const policeStations = {
                "Bengaluru Urban": ["Koramangala PS", "Indiranagar PS", "Whitefield PS", "Jayanagar PS"],
                "Mysuru": ["Devaraja PS", "Lashkar PS", "K.R. Puram PS"],
                "Belagavi": ["Market PS", "Khade Bazar PS", "Camp PS"],
                "Kalaburagi": ["Chowk PS", "Station Bazar PS"],
                "Hubballi-Dharwad": ["Gokul Road PS", "Suburban PS"],
                "Mangaluru": ["Kadir PS", "Urwa PS", "Pandeshwar PS"],
                "Shivamogga": ["Kote PS", "Tunga PS"],
                "Davanagere": ["Extension PS", "Gandhinagar PS"],
                "Ballari": ["Brucepet PS", "Gandhinagar PS"],
                "Tumakuru": ["Kyathasandra PS", "Town PS"],
                "Kolar": ["Town PS", "Galipet PS"],
                "Bidar": ["Gandhi Gunj PS", "Market PS"],
                "Raichur": ["West PS", "Market PS"],
                "Udupi": ["Town PS", "Manipal PS"],
                "Hassan": ["Extension PS", "Pension Lane PS"]
            };
            const list = policeStations[selected] || [];
            list.forEach(st => {
                const opt = document.createElement("option");
                opt.value = st;
                opt.innerText = st;
                stationSelect.appendChild(opt);
            });
        }
        applyIncidentFilters();
    });

    // Event listeners for other filters
    document.getElementById("filter-station").addEventListener("change", applyIncidentFilters);
    document.getElementById("filter-crime-type").addEventListener("change", applyIncidentFilters);
    document.getElementById("filter-severity").addEventListener("change", applyIncidentFilters);
    document.getElementById("filter-status").addEventListener("change", applyIncidentFilters);
    document.getElementById("filter-date").addEventListener("change", applyIncidentFilters);
    document.getElementById("filter-weapon").addEventListener("change", applyIncidentFilters);

    // Reset filters
    document.getElementById("btn-reset-filters").addEventListener("click", () => {
        document.getElementById("filter-district").value = 'all';
        document.getElementById("filter-station").innerHTML = '<option value="all">All Stations</option>';
        document.getElementById("filter-crime-type").value = 'all';
        document.getElementById("filter-severity").value = 'all';
        document.getElementById("filter-status").value = 'all';
        document.getElementById("filter-date").value = 'all';
        document.getElementById("filter-weapon").value = 'all';
        applyIncidentFilters();
    });
}

function applyIncidentFilters() {
    const district = document.getElementById("filter-district").value;
    const station = document.getElementById("filter-station").value;
    const type = document.getElementById("filter-crime-type").value;
    const severity = document.getElementById("filter-severity").value;
    const status = document.getElementById("filter-status").value;
    const dateRange = document.getElementById("filter-date").value;
    const weapon = document.getElementById("filter-weapon").value;

    let filtered = crimeRecords.filter(r => {
        if (district !== 'all' && r.district !== district) return false;
        if (station !== 'all' && r.policeStation !== station) return false;
        if (type !== 'all' && r.crimeType !== type) return false;
        if (severity !== 'all' && r.severity !== severity) return false;
        if (status !== 'all' && r.status !== status) return false;
        if (weapon !== 'all' && r.weapon !== weapon) return false;
        
        // Date Check
        if (dateRange !== 'all') {
            const timeDiff = new Date() - r.dateTime;
            const hr = 1000 * 60 * 60;
            if (dateRange === 'today' && timeDiff > 24 * hr) return false;
            if (dateRange === 'week' && timeDiff > 7 * 24 * hr) return false;
            if (dateRange === 'month' && timeDiff > 30 * 24 * hr) return false;
        }

        return true;
    });

    renderRecordsTable(filtered);
}

function inspectIncident(firNumber) {
    const record = crimeRecords.find(r => r.firNumber === firNumber);
    if (!record) return;
    
    // Navigate to Chat or alert details to show AI summary
    navigateToView('ai-assistant');
    askChatAssistant(`Show details for FIR ${firNumber}`);
}

// --- 3. Load GIS Map View ---
function loadGISMapView() {
    setTimeout(() => {
        buildFullGISMap();
    }, 100);
}

function buildFullGISMap() {
    if (gisMap) {
        gisMap.remove();
    }

    gisMap = L.map('full-gis-map', {
        center: [14.5, 75.7139], // Center of Karnataka
        zoom: 7,
        zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; CartoDB Dark Matter'
    }).addTo(gisMap);

    mapMarkersGroup = L.layerGroup().addTo(gisMap);
    mapCirclesGroup = L.layerGroup().addTo(gisMap);

    // Apply layers check
    renderGISMapOverlays();

    // Map filters listeners
    document.getElementById("layer-heatmap").addEventListener("change", renderGISMapOverlays);
    document.getElementById("layer-stations").addEventListener("change", renderGISMapOverlays);
    document.getElementById("layer-risk-rings").addEventListener("change", renderGISMapOverlays);
    document.getElementById("map-filter-category").addEventListener("change", renderGISMapOverlays);
    document.getElementById("map-filter-time").addEventListener("change", renderGISMapOverlays);

    // Render district tallies in Map Sidebar
    const listSidebar = document.getElementById("map-high-risk-districts-list");
    listSidebar.innerHTML = '';
    
    const sorted = Object.entries(DISTRICTS_GEO).sort((a,b) => b[1].crimes - a[1].crimes);
    sorted.forEach(([dName, val]) => {
        const item = document.createElement("div");
        item.className = "high-risk-list-item";
        item.style.cursor = 'pointer';
        item.onclick = () => {
            gisMap.setView([val.lat, val.lng], 9);
        };
        item.innerHTML = `
            <div>
                ${val.risk === 'High' ? `<span class="p-dot"></span>` : `<span class="p-dot" style="background-color:orange;"></span>`}
                <span class="font-bold">${dName}</span>
            </div>
            <div class="cyan-text font-telemetry">${val.crimes} incidents</div>
        `;
        listSidebar.appendChild(item);
    });
}

function renderGISMapOverlays() {
    if (!gisMap) return;
    mapMarkersGroup.clearLayers();
    mapCirclesGroup.clearLayers();

    const showHeatmap = document.getElementById("layer-heatmap").checked;
    const showStations = document.getElementById("layer-stations").checked;
    const showRiskRings = document.getElementById("layer-risk-rings").checked;
    const categoryFilter = document.getElementById("map-filter-category").value;
    const timeFilter = document.getElementById("map-filter-time").value;

    // 1. Draw District Risk Heatmaps / Rings
    Object.entries(DISTRICTS_GEO).forEach(([dName, geo]) => {
        if (showHeatmap) {
            // Draw hot circles
            let intensityColor = geo.risk === 'High' ? '#FF3B30' : (geo.risk === 'Medium' ? '#FFA500' : '#2ECC71');
            L.circle([geo.lat, geo.lng], {
                radius: geo.crimes * 10, // scale area based on crime volume
                fillColor: intensityColor,
                color: 'transparent',
                fillOpacity: 0.15
            }).addTo(mapCirclesGroup)
            .bindTooltip(`<h4>${dName} District</h4>Total Crime Index: ${geo.crimes}<br>Alert Risk level: ${geo.risk}`);
        }

        if (showRiskRings && geo.risk === 'High') {
            // Draw pulsing outer rings
            L.circleMarker([geo.lat, geo.lng], {
                radius: 18,
                fillColor: 'transparent',
                color: '#FF3B30',
                weight: 1.5,
                className: 'pulsing-district-ring'
            }).addTo(mapCirclesGroup);
        }
    });

    // 2. Draw filtered crime records / stations
    crimeRecords.forEach(r => {
        if (categoryFilter !== 'all' && r.crimeType !== categoryFilter) return;
        
        // Time filter shift check
        if (timeFilter !== 'all') {
            const hr = r.dateTime.getHours();
            const isDay = hr >= 6 && hr < 18;
            if (timeFilter === 'day' && !isDay) return;
            if (timeFilter === 'night' && isDay) return;
        }

        // Get district coordinate
        const geo = DISTRICTS_GEO[r.district];
        if (!geo) return;

        // Jitter coordinate slightly so overlap is minimized
        const jitterLat = geo.lat + (Math.random() - 0.5) * 0.08;
        const jitterLng = geo.lng + (Math.random() - 0.5) * 0.08;

        if (showStations && r.isRepeatOffender) {
            // High threat repeat offenders markers
            L.circleMarker([jitterLat, jitterLng], {
                radius: 6,
                fillColor: '#FF3B30',
                color: '#0D1117',
                weight: 1,
                fillOpacity: 0.9
            }).addTo(mapMarkersGroup)
            .bindPopup(`
                <h4>🔴 CRIME HOTSPOT DETECTED</h4>
                <b>FIR:</b> ${r.firNumber}<br>
                <b>Type:</b> ${r.crimeType}<br>
                <b>Offender:</b> ${r.offenderName} (${r.criminalId})<br>
                <b>Station:</b> ${r.policeStation}<br>
                <b>Severity:</b> ${r.severity}
            `);
        }
    });
}

// --- 4. Network Relationship Graph View ---
function loadNetworkGraphView() {
    initNetworkCanvasSim();
}

function initNetworkCanvasSim() {
    const canvas = document.getElementById("network-canvas");
    const ctx = canvas.getContext("2d");

    // Dynamic resize
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Simulation loop
    networkState.simulationActive = true;
    
    // Drag handlers
    canvas.onmousedown = (e) => {
        const mouseX = (e.offsetX - networkState.offsetX) / networkState.zoom;
        const mouseY = (e.offsetY - networkState.offsetY) / networkState.zoom;
        
        // Find clicked node
        let clickedNode = null;
        networkData.nodes.forEach(n => {
            const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
            if (dist < n.val + 5) {
                clickedNode = n;
            }
        });

        if (clickedNode) {
            networkState.draggedNode = clickedNode;
            inspectNetworkEntity(clickedNode);
        } else {
            networkState.isDraggingCanvas = true;
            networkState.dragStartX = e.offsetX;
            networkState.dragStartY = e.offsetY;
        }
    };

    canvas.onmousemove = (e) => {
        const mouseX = (e.offsetX - networkState.offsetX) / networkState.zoom;
        const mouseY = (e.offsetY - networkState.offsetY) / networkState.zoom;
        
        // Canvas drag
        if (networkState.isDraggingCanvas) {
            networkState.offsetX += e.offsetX - networkState.offsetX - (networkState.dragStartX - networkState.offsetX);
            networkState.offsetY += e.offsetY - networkState.offsetY - (networkState.dragStartY - networkState.offsetY);
            networkState.dragStartX = e.offsetX;
            networkState.dragStartY = e.offsetY;
            return;
        }

        // Node drag
        if (networkState.draggedNode) {
            networkState.draggedNode.x = mouseX;
            networkState.draggedNode.y = mouseY;
            return;
        }

        // Hover detect
        let hoverNode = null;
        networkData.nodes.forEach(n => {
            const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
            if (dist < n.val + 5) {
                hoverNode = n;
            }
        });
        networkState.hoveredNode = hoverNode;
        canvas.style.cursor = hoverNode ? 'pointer' : (networkState.isDraggingCanvas ? 'grabbing' : 'grab');
    };

    canvas.onmouseup = () => {
        networkState.draggedNode = null;
        networkState.isDraggingCanvas = false;
    };

    canvas.onmouseleave = () => {
        networkState.draggedNode = null;
        networkState.isDraggingCanvas = false;
    };

    // Run animation frames
    function step() {
        if (!networkState.simulationActive || activeView !== 'network') return;
        
        updatePhysics();
        drawNetwork();
        
        requestAnimationFrame(step);
    }
    
    // Position node nodes reasonably centered
    networkData.nodes.forEach(n => {
        if (n.x < 50 || n.x > canvas.width - 50) n.x = Math.random() * (canvas.width - 150) + 75;
        if (n.y < 50 || n.y > canvas.height - 50) n.y = Math.random() * (canvas.height - 150) + 75;
    });

    requestAnimationFrame(step);
}

function updatePhysics() {
    const nodes = networkData.nodes;
    const links = networkData.links;
    
    const kRepulsion = 1200;
    const kAttraction = 0.04;
    const restingDist = 70;
    const centerGravity = 0.015;
    
    const canvas = document.getElementById("network-canvas");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // 1. Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
        let n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
            let n2 = nodes[j];
            let dx = n2.x - n1.x;
            let dy = n2.y - n1.y;
            let dist = Math.hypot(dx, dy) || 1;
            
            // Repulsion force
            let force = kRepulsion / (dist * dist);
            let fx = (dx / dist) * force;
            let fy = (dy / dist) * force;
            
            if (n1 !== networkState.draggedNode) {
                n1.vx -= fx;
                n1.vy -= fy;
            }
            if (n2 !== networkState.draggedNode) {
                n2.vx += fx;
                n2.vy += fy;
            }
        }
    }

    // 2. Attraction along link paths
    links.forEach(link => {
        let sourceNode = nodes.find(n => n.id === link.source);
        let targetNode = nodes.find(n => n.id === link.target);
        
        if (!sourceNode || !targetNode) return;
        
        let dx = targetNode.x - sourceNode.x;
        let dy = targetNode.y - sourceNode.y;
        let dist = Math.hypot(dx, dy) || 1;
        
        let force = kAttraction * (dist - restingDist);
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;
        
        if (sourceNode !== networkState.draggedNode) {
            sourceNode.vx += fx;
            sourceNode.vy += fy;
        }
        if (targetNode !== networkState.draggedNode) {
            targetNode.vx -= fx;
            targetNode.vy -= fy;
        }
    });

    // 3. Center gravity and position update
    nodes.forEach(n => {
        if (n === networkState.draggedNode) return;
        
        // Pull to center
        n.vx += (centerX - n.x) * centerGravity;
        n.vy += (centerY - n.y) * centerGravity;
        
        // Dampening friction
        n.vx *= 0.82;
        n.vy *= 0.82;
        
        // Update positions
        n.x += n.vx;
        n.y += n.vy;
    });
}

function drawNetwork() {
    const canvas = document.getElementById("network-canvas");
    const ctx = canvas.getContext("2d");
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(networkState.offsetX, networkState.offsetY);
    ctx.scale(networkState.zoom, networkState.zoom);

    // 1. Draw Links
    networkData.links.forEach(link => {
        const sourceNode = networkData.nodes.find(n => n.id === link.source);
        const targetNode = networkData.nodes.find(n => n.id === link.target);
        
        if (!sourceNode || !targetNode) return;

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        
        // Link styling
        if (link.style === 'scan-pulse') {
            ctx.strokeStyle = '#FF3B30';
            ctx.lineWidth = 1.8;
            ctx.shadowColor = '#FF3B30';
            ctx.shadowBlur = 6;
        } else {
            ctx.strokeStyle = 'rgba(18, 53, 91, 0.45)';
            ctx.lineWidth = 1.2;
            ctx.shadowBlur = 0;
        }
        ctx.stroke();
    });

    // 2. Draw Nodes
    networkData.nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.val, 0, 2 * Math.PI);
        
        // Node Type Colors
        let color = '#8B949E';
        if (n.type === 'suspect') color = '#E74C3C';
        else if (n.type === 'victim') color = '#2ECC71';
        else if (n.type === 'location') color = '#E67E22';
        else if (n.type === 'vehicle') color = '#F1C40F';
        else if (n.type === 'weapon') color = '#9B59B6';
        else if (n.type === 'mobile') color = '#1ABC9C';
        else if (n.type === 'bank') color = '#3498DB';
        
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = (networkState.hoveredNode === n) ? 12 : 3;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Double rings on hover/dragged
        if (networkState.hoveredNode === n || networkState.draggedNode === n) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.val + 4, 0, 2 * Math.PI);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw node labels
        ctx.fillStyle = '#F3F4F6';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + n.val + 14);
    });

    ctx.restore();
}

function inspectNetworkEntity(node) {
    const inspector = document.getElementById("network-inspector-panel");
    const placeholder = document.getElementById("inspector-placeholder-text");
    const mainContent = document.getElementById("inspector-main-content");
    
    placeholder.classList.add("hide");
    mainContent.classList.remove("hide");

    // Populate metadata
    document.getElementById("ins-name").innerText = node.label;
    document.getElementById("ins-meta-subtitle").innerText = `ID/Serial: ${node.id}`;
    
    let typeLabel = node.type.toUpperCase();
    document.getElementById("ins-type").innerText = typeLabel;
    
    let scoreBox = document.getElementById("ins-score");
    if(node.score) {
        scoreBox.innerText = node.score + "% Recidivism Risk";
        scoreBox.parentElement.style.display = 'flex';
    } else {
        scoreBox.parentElement.style.display = 'none';
    }

    // Avatar Box theme colors
    const avatar = document.getElementById("ins-avatar-box");
    avatar.className = `entity-avatar-large ${node.type}`;
    
    // Set icon base
    const icon = document.getElementById("ins-icon");
    icon.className = 'fa-solid';
    if(node.type === 'suspect') icon.classList.add('fa-user-ninja');
    else if(node.type === 'location') icon.classList.add('fa-map-pin');
    else if(node.type === 'vehicle') icon.classList.add('fa-car-side');
    else if(node.type === 'weapon') icon.classList.add('fa-shield-halved');
    else if(node.type === 'mobile') icon.classList.add('fa-mobile-screen');
    else if(node.type === 'bank') icon.classList.add('fa-wallet');

    // List links
    const directConnList = document.getElementById("ins-direct-connections");
    directConnList.innerHTML = '';
    
    const associatedLinks = networkData.links.filter(l => l.source === node.id || l.target === node.id);
    associatedLinks.forEach(l => {
        const otherId = l.source === node.id ? l.target : l.source;
        const otherNode = networkData.nodes.find(n => n.id === otherId);
        if(!otherNode) return;

        const div = document.createElement("div");
        div.className = "connection-item";
        div.onclick = () => {
            inspectNetworkEntity(otherNode);
        };
        div.innerHTML = `
            <span>${otherNode.label}</span>
            <span class="c-lbl font-telemetry">${l.label}</span>
        `;
        directConnList.appendChild(div);
    });

    // AI summary
    const aiBubble = document.getElementById("ins-ai-deduction");
    if (node.type === 'suspect') {
        aiBubble.innerText = `AI Analysis flags high recurrence path. Associated target is linked to multi-district checkpost warnings. Recommendation is to prioritize electronic trace of mobiles linked to this node.`;
    } else {
        aiBubble.innerText = `Entity linked to ${associatedLinks.length} suspect nodes. Visual evidence coordinates point to high density overlap in Bengaluru CBD nodes. Confidence: 84%.`;
    }
}

// Adjust network zoom controls
function adjustNetworkZoom(factor) {
    networkState.zoom = Math.max(0.5, Math.min(2.5, networkState.zoom * factor));
}

function resetNetworkView() {
    networkState.zoom = 1.0;
    networkState.offsetX = 0;
    networkState.offsetY = 0;
    // Re-jitter layout coordinates
    const canvas = document.getElementById("network-canvas");
    networkData.nodes.forEach(n => {
        n.x = Math.random() * (canvas.width - 200) + 100;
        n.y = Math.random() * (canvas.height - 200) + 100;
        n.vx = 0;
        n.vy = 0;
    });
}

function triggerHiddenNetworkScan() {
    if(networkState.hiddenScanRunning) return;
    networkState.hiddenScanRunning = true;
    
    const overlay = document.getElementById("network-scan-overlay");
    const progressText = document.getElementById("scan-progress-text");
    overlay.style.display = 'flex';
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 4;
        progressText.innerText = `ANALYZING LINK CORRELATIONS [${progress}%]`;
        
        if (progress >= 100) {
            clearInterval(interval);
            overlay.style.display = 'none';
            networkState.hiddenScanRunning = false;
            
            // Add new nodes/links to the graph to show new "revealed" connections!
            revealHiddenSyndicateLinks();
        }
    }, 100);
}

function revealHiddenSyndicateLinks() {
    // Inject custom glowing nodes
    const canvas = document.getElementById("network-canvas");
    
    // Check if already injected
    if (networkData.nodes.find(n => n.id === "weap-hidden-rifles")) {
        alert("Scan Completed: Core associations already fully mapped in network panel.");
        return;
    }

    // Add hidden weapon and phone link
    networkData.nodes.push({
        id: "weap-hidden-rifles",
        label: "[REVEALED] Cache of M-4 Rifles",
        type: 'weapon',
        val: 14,
        score: 95
    });
    
    // Jitter position near center
    const wNode = networkData.nodes[networkData.nodes.length - 1];
    wNode.x = canvas.width / 2 + 50;
    wNode.y = canvas.height / 2 - 50;

    networkData.links.push({ source: "KSP-CR-9912", target: "weap-hidden-rifles", label: "Hidden Owner", style: "scan-pulse" });
    networkData.links.push({ source: "KSP-CR-9935", target: "weap-hidden-rifles", label: "Procured by", style: "scan-pulse" });

    // Update Telemetries
    document.getElementById("node-count-span").innerText = networkData.nodes.length;
    document.getElementById("link-count-span").innerText = networkData.links.length;

    // Trigger alert sound or text feedback
    alert("CRITICAL WARNING: 2 hidden connection paths resolved linking suspect Vikram Gowda to bulk firearms dealer.");
}

// --- 5. Predictive Analytics View ---
function loadPredictiveView() {
    // Build forecasting and threat matrix charts
    buildPredictiveCharts();
}

function buildPredictiveCharts() {
    const textMainColor = '#F3F4F6';
    const gridLineColor = 'rgba(255, 255, 255, 0.05)';
    const accentColor = '#00C8FF';
    
    // 30 Day forecast (Actual vs Prediction with limits)
    const ctxFore = document.getElementById("chart-predictive-forecast").getContext("2d");
    if(charts.predictiveFore) charts.predictiveFore.destroy();
    
    charts.predictiveFore = new Chart(ctxFore, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30'],
            datasets: [
                {
                    label: 'Actual / Target Cases (Past)',
                    data: [42, 45, 38, null, null, null, null],
                    borderColor: accentColor,
                    borderWidth: 2,
                    pointBackgroundColor: accentColor
                },
                {
                    label: 'AI Predictive Mean',
                    data: [null, null, 38, 41, 46, 50, 48],
                    borderColor: '#9B59B6',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointBackgroundColor: '#9B59B6'
                },
                {
                    label: 'Confidence Ceiling (95%)',
                    data: [null, null, 42, 48, 54, 60, 58],
                    borderColor: 'rgba(155, 89, 182, 0.25)',
                    borderWidth: 1,
                    fill: '+1',
                    backgroundColor: 'rgba(0, 200, 255, 0.05)'
                },
                {
                    label: 'Confidence Floor (95%)',
                    data: [null, null, 34, 34, 38, 40, 38],
                    borderColor: 'rgba(155, 89, 182, 0.25)',
                    borderWidth: 1,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: textMainColor } } },
            scales: {
                x: { grid: { color: gridLineColor }, ticks: { color: textMainColor } },
                y: { grid: { color: gridLineColor }, ticks: { color: textMainColor } }
            }
        }
    });

    // Category Threat Index matrix bar
    const ctxMat = document.getElementById("chart-predictive-matrix").getContext("2d");
    if(charts.predictiveMat) charts.predictiveMat.destroy();

    charts.predictiveMat = new Chart(ctxMat, {
        type: 'bar',
        data: {
            labels: ['Cyber Fraud', 'Narcotics Checkposts', 'Organized Bank Theft', 'SUV Carjack', 'Bail Skips'],
            datasets: [{
                label: 'Threat Index Metric (0-10)',
                data: [9.4, 8.2, 7.8, 6.4, 5.8],
                backgroundColor: [
                    'rgba(255, 59, 48, 0.7)',
                    'rgba(255, 165, 0, 0.7)',
                    'rgba(255, 165, 0, 0.7)',
                    'rgba(0, 200, 255, 0.7)',
                    'rgba(0, 200, 255, 0.7)'
                ],
                borderColor: accentColor,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { max: 10, grid: { color: gridLineColor }, ticks: { color: textMainColor } },
                y: { grid: { color: gridLineColor }, ticks: { color: textMainColor } }
            }
        }
    });
}

// --- 6. Repeat Offender Profiles Dashboard ---
function loadRepeatOffendersView() {
    const listScroll = document.getElementById("offender-profiles-list");
    listScroll.innerHTML = '';

    repeatOffenders.forEach(o => {
        const item = document.createElement("div");
        item.className = "offender-list-item";
        item.setAttribute("data-id", o.id);
        item.onclick = () => {
            selectOffender(o.id);
        };
        
        item.innerHTML = `
            <img src="${o.photo}" alt="" class="offender-avatar-thumb">
            <div class="offender-thumb-info">
                <h4>${o.name}</h4>
                <p class="font-telemetry">${o.id} | ${o.district}</p>
            </div>
            <span class="offender-badge-score high font-telemetry">${o.recidivismScore}%</span>
        `;
        listScroll.appendChild(item);
    });

    // Search offender input handler
    const offSearch = document.getElementById("offender-search-input");
    offSearch.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        const items = document.querySelectorAll(".offender-list-item");
        items.forEach(it => {
            const name = it.querySelector("h4").innerText.toLowerCase();
            const id = it.getAttribute("data-id").toLowerCase();
            if(name.includes(q) || id.includes(q)) {
                it.style.display = 'flex';
            } else {
                it.style.display = 'none';
            }
        });
    });
}

function selectOffender(id) {
    const o = repeatOffenders.find(off => off.id === id);
    if (!o) return;

    // Highlight selected item in sidebar
    const items = document.querySelectorAll(".offender-list-item");
    items.forEach(it => {
        if(it.getAttribute("data-id") === id) it.classList.add("selected");
        else it.classList.remove("selected");
    });

    document.getElementById("offender-details-placeholder").classList.add("hide");
    document.getElementById("offender-profile-main").classList.remove("hide");

    // Fill data
    document.getElementById("offender-photo").src = o.photo;
    document.getElementById("offender-name").innerText = o.name;
    document.getElementById("offender-id").innerText = o.id;
    document.getElementById("offender-aliases").innerText = o.aliases;
    document.getElementById("offender-recidivism-score").innerText = `${o.recidivismScore}%`;
    document.getElementById("offender-convictions").innerText = o.convictions;
    
    // AI analysis
    document.getElementById("offender-ai-summary").innerText = o.aiSummary;

    // Profile table
    document.getElementById("offender-age-gender").innerText = `Male / ${o.age} Yrs`;
    document.getElementById("offender-primary-district").innerText = o.district;
    document.getElementById("offender-modus-operandi").innerText = o.modusOperandi;
    document.getElementById("offender-associated-weapons").innerText = o.weapons.join(", ");
    document.getElementById("offender-status").innerText = o.status;

    // Linked network count
    const links = networkData.links.filter(l => l.source === o.id || l.target === o.id);
    document.getElementById("offender-network-links-count").innerText = links.length * 3; // mock scaled weighting

    // Associates pills
    const assocBox = document.getElementById("offender-associates-list");
    assocBox.innerHTML = '';
    o.linkedAssociates.forEach(as => {
        const pill = document.createElement("span");
        pill.className = "associate-pill";
        pill.innerText = as;
        pill.onclick = () => {
            // Find ID inside parentheses
            const match = as.match(/\(([^)]+)\)/);
            if(match && match[1]) {
                const targetId = match[1];
                if(repeatOffenders.find(x=>x.id === targetId)) {
                    selectOffender(targetId);
                } else {
                    // Navigate to network view and inspect
                    navigateToView('network');
                    setTimeout(() => {
                        const node = networkData.nodes.find(n => n.id === targetId);
                        if(node) inspectNetworkEntity(node);
                    }, 200);
                }
            }
        };
        assocBox.appendChild(pill);
    });

    // Timeline fill
    const timelineBox = document.getElementById("offender-timeline");
    timelineBox.innerHTML = '';
    o.timeline.forEach((t, idx) => {
        const div = document.createElement("div");
        div.className = `timeline-item ${idx === 0 ? 'recent' : ''}`;
        div.innerHTML = `
            <div class="timeline-date font-telemetry">${t.date}</div>
            <div class="timeline-card">
                <h5>${t.title}</h5>
                <p>${t.desc}</p>
            </div>
        `;
        timelineBox.appendChild(div);
    });
}

// --- 7. Reports Workbench View ---
function loadReportsView() {
    // Generate default draft report if empty
    generateSelectedReport();
}

function generateSelectedReport() {
    const template = document.getElementById("report-type-select").value;
    const jurisdiction = document.getElementById("report-district-select").value;
    const period = document.getElementById("report-period-select").value;

    const showConfidence = document.getElementById("rep-opt-confidence").checked;
    const showGraph = document.getElementById("rep-opt-graph").checked;
    const showHotspots = document.getElementById("rep-opt-hotspots").checked;

    const previewDoc = document.getElementById("report-document-body");
    previewDoc.innerHTML = '';

    let templateTitle = "STATE SECURITY ANALYTICS BRIEF";
    let docMetaCode = "KSP-SEC-DOC-2026-X49";
    
    let contentHtml = '';
    let now = new Date();

    if (template === 'district') {
        templateTitle = `DISTRICT CRIME SUMMARY - ${jurisdiction.toUpperCase()}`;
        contentHtml = `
            <div class="report-text-section">
                <h3>1. EXECUTIVE OVERVIEW</h3>
                <p>Analytical brief capturing crime telemetry within target block: <b>${jurisdiction}</b>. Current dataset spans 120 incident vectors including repeat offenders recidivism alerts.</p>
                
                <h3>2. TELEMETRY INDICES</h3>
                <p>During the current sync cycle, the following counts were resolved:
                   <br>&bull; Burglary Incidents: 24 cases.
                   <br>&bull; Cyber/Phishing Incidents: 42 cases.
                   <br>&bull; Armed Assault: 18 cases.
                </p>
                
                <h3>3. JURISDICTION AUDIT SUMMARY</h3>
                <p>Critical hotspot density mapped coordinates are focused near commercial sectors. High alert rings continue pulsing in Eastern precincts. Resource dispatch levels are suggested to be incremented by 15% during night shifts.</p>
            </div>
        `;
    } else if (template === 'monthly') {
        templateTitle = "MONTHLY CRIME INDEX REPORT - ALL DISTRICTS";
        contentHtml = `
            <div class="report-text-section">
                <h3>1. MONTHLY OVERVIEW</h3>
                <p>This document reports general incident vectors across Karnataka state. Crime volumes increased by 4.2% overall, with a sharp decline in physical street offenses offset by digital financial fraud.</p>
                
                <h3>2. DISTRICT BREAKDOWN INDEX</h3>
                <p>Bengaluru Urban remains the highest density hotspot (4,521 total crimes resolved), followed by Mysuru (1,845 crimes). Least density resolved in Raichur (390 crimes).</p>
            </div>
        `;
    } else if (template === 'ai-rec') {
        templateTitle = "AI STRATEGIC DEPLOYMENT SUGGESTIONS";
        contentHtml = `
            <div class="report-text-section">
                <h3>1. COGNITIVE ALGORITHM ACTIONABLE FEED</h3>
                <p>Predictive analytics calculations estimate a 91% probability spike of burglary crimes in Bengaluru Rural districts over the next 14 days due to seasonal shift.</p>
                
                <h3>2. STRATEGIC DEPLOYMENT STEPS</h3>
                <p>Deploy additional KSP patrol vans to coordinates near Devanahalli toll plazas. Establish mobile barriers from 23:00 to 04:00 hours. Maintain high sync frequency in cyber cells.</p>
            </div>
        `;
    } else {
        templateTitle = "OFFICIAL CONSOLIDATED CONSOLE BRIEF";
        contentHtml = `
            <div class="report-text-section">
                <h3>1. INVESTIGATION STATUS AUDIT</h3>
                <p>Current active cases cleared rate is calculated at 78.5% with 2,143 pending folders in database. Repeat offenders links are traced continuously via the network link pane.</p>
            </div>
        `;
    }

    // Embed optional components
    let confSection = showConfidence ? `
        <div class="report-text-section" style="border-top:1px solid rgba(255,255,255,0.08); padding-top:10px; margin-top:20px;">
            <p><b>[AI TELEMETRY METRIC]:</b> Global Engine model accuracy verified at <b>96.4% confidence score</b>. Core algorithms are synchronized with state criminal registries.</p>
        </div>
    ` : '';

    let graphSection = showGraph ? `
        <div class="report-text-section">
            <h3>APPENDIX A: LINK ASSOCIATION DIAGRAM INDEX</h3>
            <p>Suspect mapping records are currently tracing 3 active multi-district linkages. Primary target Vikram Gowda (KSP-CR-9912) is flagged with high network correlation values.</p>
        </div>
    ` : '';

    let hotSection = showHotspots ? `
        <div class="report-text-section">
            <h3>APPENDIX B: GIS SPATIAL COORDINATES LIST</h3>
            <p>Bengaluru CBD: 12.9716° N, 77.5946° E (Radius: 2.2km Heat Focus)<br>
               Mysuru Extension: 12.2958° N, 76.6394° E (Radius: 1.5km Heat Focus)</p>
        </div>
    ` : '';

    previewDoc.innerHTML = `
        <div class="gov-report-logo">
            <div>
                <h1>KARNATAKA STATE POLICE</h1>
                <p>COMMAND INTELLIGENCE DIVISION | OFFICIAL BRIEF</p>
            </div>
            <div style="text-align:right;">
                <p class="font-telemetry">${docMetaCode}</p>
                <p>${now.toLocaleDateString()}</p>
            </div>
        </div>
        <div class="report-meta-header font-telemetry">
            <div><b>REPORT TEMPLATE:</b> ${templateTitle}</div>
            <div><b>REPORTING WINDOW:</b> ${period.toUpperCase()}</div>
            <div><b>JURISDICTION FILTER:</b> ${jurisdiction.toUpperCase()}</div>
            <div><b>SECURITY RATING:</b> CONFIDENTIAL / SECRET</div>
        </div>
        ${contentHtml}
        ${confSection}
        ${graphSection}
        ${hotSection}
        <div style="text-align:center; font-size:9px; color:#8B949E; margin-top:40px; border-top:1px solid #8B949E; padding-top:10px;">
            THIS IS A DIGITAL COMPUTER GENERATED ANALYTICS REPORT. SIGNATURE NOT REQUIRED.
        </div>
    `;
}

function printReport() {
    window.print();
}

function exportReportCSV() {
    const csvContent = "data:text/csv;charset=utf-8,District,Crime Category,Severity,Incident Count\n"
        + "Bengaluru Urban,Cybercrime,High,1452\n"
        + "Bengaluru Urban,Burglary,Medium,984\n"
        + "Mysuru,Assault,High,420\n"
        + "Belagavi,Narcotics,High,382\n"
        + "Hubli,Robbery,Medium,210";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "KSP_Crime_Brief.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 8. AI Chat Assistant Logic ---
function askChatAssistant(query) {
    const chatLog = document.getElementById("chat-messages-log");
    if (!chatLog) return;

    // Append User Message
    const userDiv = document.createElement("div");
    userDiv.className = "chat-message user";
    userDiv.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid fa-user-shield"></i></div>
        <div class="msg-content"><p>${query}</p></div>
    `;
    chatLog.appendChild(userDiv);
    chatLog.scrollTop = chatLog.scrollHeight;

    // Simulate AI loading typing feel
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "chat-message bot loading-msg";
    loadingDiv.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="msg-content"><p class="blink">AI computing database query...</p></div>
    `;
    chatLog.appendChild(loadingDiv);
    chatLog.scrollTop = chatLog.scrollHeight;

    // AI Response Matrix
    let responseHtml = '';
    const cleanQuery = query.toLowerCase();

    setTimeout(() => {
        // Remove loading
        chatLog.removeChild(loadingDiv);

        if (cleanQuery.includes("burglary") && cleanQuery.includes("mysuru")) {
            responseHtml = `
                <p>I found <b>8 Burglary incidents</b> in Mysuru District matching active filters. Here is the query overview:</p>
                <table>
                    <thead>
                        <tr><th>FIR Number</th><th>Offender</th><th>Station</th><th>Severity</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>FIR-2026-Mysuru-1003</td><td>Anil Kumar</td><td>Devaraja PS</td><td>Medium</td></tr>
                        <tr><td>FIR-2026-Mysuru-1024</td><td>Unidentified</td><td>Lashkar PS</td><td>High</td></tr>
                        <tr><td>FIR-2026-Mysuru-1035</td><td>Vikram Gowda</td><td>K.R. Puram PS</td><td>High</td></tr>
                    </tbody>
                </table>
                <p><b>AI Insights:</b> Vikram Gowda is linked to 1 of these heists using similar cylinder tool techniques. Surveillance recommended near Mysuru ring road checkpoints.</p>
            `;
        } else if (cleanQuery.includes("repeat offenders") || cleanQuery.includes("offender")) {
            responseHtml = `
                <p>Scanning repeat offender database logs. Mapped <b>3 high-risk entities</b>:</p>
                <br>1. <b>Vikram Gowda (KSP-CR-9912)</b>: Recidivism risk <b>94%</b> (Wanted).
                <br>2. <b>Rahul Sharma (KSP-CR-9921)</b>: Recidivism risk <b>84%</b> (In Custody).
                <br>3. <b>Anil Kumar (KSP-CR-9935)</b>: Recidivism risk <b>78%</b> (Wanted).
                <p>You can click on the 'Repeat Offenders' tab in the navigation menu to inspect timeline activities and associated graphics.</p>
            `;
        } else if (cleanQuery.includes("hotspot") || cleanQuery.includes("hotspots")) {
            responseHtml = `
                <p>GIS telemetry outlines <b>9 active high-density hotspots</b> in Karnataka state. Core hot zones resolved:</p>
                <br>&bull; <b>Bengaluru Urban:</b> East and South precincts (Primary heat: Cybercrime & SUV theft).
                <br>&bull; <b>Mysuru CBD:</b> Jewelry shop lockers (Burglary).
                <br>&bull; <b>Belagavi Border checkpost:</b> Logistics smuggling routes.
                <p>Pulsing alert circles have been mapped to the interactive <b>Crime Map</b> portal.</p>
            `;
        } else if (cleanQuery.includes("predict") || cleanQuery.includes("risk")) {
            responseHtml = `
                <p><b>AI Predictive Policing Forecast (Next 30 Days):</b></p>
                <br>&bull; <b>91% Confidence:</b> Cyber-financial fraud spikes inside Bengaluru East.
                <br>&bull; <b>88% Confidence:</b> High frequency seasonal break-ins during festival weeks in Shivamogga.
                <br>&bull; <b>92% Confidence:</b> Inter-state smuggler movement along Belagavi corridor highways.
            `;
        } else if (cleanQuery.includes("bengaluru") && cleanQuery.includes("trend")) {
            responseHtml = `
                <p><b>Bengaluru Urban Crime Trend Analysis:</b></p>
                <p>Historical telemetry shows a <b>4.2% rise</b> in weekly cyber thefts. Physical heists remain plateaued due to increased night patrols deployment. Recommended cyber threat index holds at <b>9.4/10</b>.</p>
            `;
        } else if (cleanQuery.includes("fir")) {
            responseHtml = `
                <p><b>FIR Details Resolved:</b></p>
                <p>Incident registered under <b>FIR-2026-Bengaluru-1024</b>. Offense type: <b>Cyber Phishing</b>. Associated vehicle suspect log: KA-03-MY-9942. Status holds as <b>Under Investigation</b>.</p>
            `;
        } else {
            responseHtml = `
                <p>Search Query matched <b>12 incidents</b>. Core index results:</p>
                <p>Type: <b>Burglary</b> | Matches: 4 files. Status: <b>Under Investigation</b>.</p>
                <p>Please clarify target parameters (district, crime type, or suspect name) to search specific fields.</p>
            `;
        }

        const botDiv = document.createElement("div");
        botDiv.className = "chat-message bot";
        botDiv.innerHTML = `
            <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="msg-content">${responseHtml}</div>
        `;
        chatLog.appendChild(botDiv);
        chatLog.scrollTop = chatLog.scrollHeight;

    }, 600);
}

// --- Floating Chat Actions ---
function toggleFloatingChat() {
    const chatCont = document.getElementById("floating-chat-container");
    if(chatCont.style.display === 'none') {
        chatCont.style.display = 'flex';
    } else {
        chatCont.style.display = 'none';
    }
}

function sendFloatingChatMessage() {
    const input = document.getElementById("float-user-input");
    const val = input.value;
    if(!val.trim()) return;
    input.value = '';

    const body = document.getElementById("float-messages-body");

    // Append user msg
    const userDiv = document.createElement("div");
    userDiv.className = "chat-message user";
    userDiv.style.alignSelf = 'flex-end';
    userDiv.innerHTML = `<div class="msg-content" style="padding:6px 10px; font-size:10px;"><p>${val}</p></div>`;
    body.appendChild(userDiv);
    body.scrollTop = body.scrollHeight;

    // Bot reply
    setTimeout(() => {
        const botDiv = document.createElement("div");
        botDiv.className = "chat-message bot";
        botDiv.innerHTML = `
            <div class="msg-avatar" style="width:24px; height:24px; font-size:10px;"><i class="fa-solid fa-robot"></i></div>
            <div class="msg-content" style="padding:6px 10px; font-size:10px;">
                <p>Query logged. State model accuracy: 96.4%. Please view main "AI Assistant" dashboard for full structured logs.</p>
            </div>
        `;
        body.appendChild(botDiv);
        body.scrollTop = body.scrollHeight;
    }, 400);
}

// --- 9. Threat Alerts Center ---
function initQuickAlerts() {
    const trigger = document.getElementById("alert-trigger");
    const quickAlerts = document.getElementById("quick-alerts");
    
    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        if(quickAlerts.style.display === 'none') {
            quickAlerts.style.display = 'block';
            renderQuickAlertsDropdown();
        } else {
            quickAlerts.style.display = 'none';
        }
    });

    document.addEventListener("click", () => {
        quickAlerts.style.display = 'none';
    });
}

function renderQuickAlertsDropdown() {
    const list = document.getElementById("quick-alerts-list");
    list.innerHTML = '';
    
    alertFeed.forEach(a => {
        const div = document.createElement("div");
        div.className = "quick-alert-item";
        
        let iconClass = 'fa-circle-exclamation';
        if(a.type === 'critical') iconClass = 'fa-triangle-exclamation alert-text';
        else if(a.type === 'warning') iconClass = 'fa-triangle-exclamation warning-text';
        else if(a.type === 'offender') iconClass = 'fa-users-viewfinder yellow-text';
        else iconClass = 'fa-arrows-spin blue-text';

        div.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <div class="quick-alert-content">
                <p>${a.title}</p>
                <span class="time font-telemetry">${a.timestamp}</span>
            </div>
        `;
        list.appendChild(div);
    });
}

function initNotificationCenter() {
    // Fill total count labels
    document.getElementById("alerts-badge-count").innerText = alertFeed.length;
}

function loadAlertsCenterView() {
    const feed = document.getElementById("alerts-center-list");
    feed.innerHTML = '';

    // Fill counters
    document.getElementById("tally-total-alerts").innerText = alertFeed.length;
    document.getElementById("tally-high-alerts").innerText = alertFeed.filter(a => a.type === 'critical').length;
    document.getElementById("tally-spike-alerts").innerText = alertFeed.filter(a => a.type === 'warning').length;
    document.getElementById("tally-offender-alerts").innerText = alertFeed.filter(a => a.type === 'offender').length;
    document.getElementById("tally-update-alerts").innerText = alertFeed.filter(a => a.type === 'update').length;

    renderAlertsCenterList(alertFeed);
}

function renderAlertsCenterList(alerts) {
    const feed = document.getElementById("alerts-center-list");
    feed.innerHTML = '';

    if (alerts.length === 0) {
        feed.innerHTML = `
            <div class="report-preloader">
                <i class="fa-solid fa-circle-check font-large success-text" style="font-size:32px;"></i>
                <p>No active alerts in KSP Threat queue.</p>
            </div>
        `;
        return;
    }

    alerts.forEach(a => {
        const div = document.createElement("div");
        div.className = `threat-alert-card ${a.type}`;
        div.innerHTML = `
            <div class="threat-left">
                <div class="threat-bullet"><i class="fa-solid fa-bell"></i></div>
                <div class="threat-info">
                    <h4>${a.title}</h4>
                    <p>${a.desc}</p>
                </div>
            </div>
            <div class="threat-right font-telemetry">
                <span class="threat-timestamp">${a.timestamp}</span>
                <div><button class="btn-ack" onclick="acknowledgeAlert('${a.id}')">Acknowledge</button></div>
            </div>
        `;
        feed.appendChild(div);
    });
}

function filterAlertsBySeverity(sev) {
    // Styling tags active
    const tallies = document.querySelectorAll(".tally-box");
    tallies.forEach(t => t.style.borderColor = 'var(--glass-border)');

    let filtered = alertFeed;
    if(sev === 'critical') filtered = alertFeed.filter(a => a.type === 'critical');
    else if(sev === 'warning') filtered = alertFeed.filter(a => a.type === 'warning');
    else if(sev === 'offender') filtered = alertFeed.filter(a => a.type === 'offender');
    else if(sev === 'update') filtered = alertFeed.filter(a => a.type === 'update');

    // Make buttons active
    const btnAll = document.getElementById("alert-btn-all");
    const btnCrit = document.getElementById("alert-btn-crit");
    if(sev === 'all') {
        btnAll.classList.add("active");
        btnCrit.classList.remove("active");
    } else if(sev === 'critical') {
        btnAll.classList.remove("active");
        btnCrit.classList.add("active");
    }

    renderAlertsCenterList(filtered);
}

function acknowledgeAlert(id) {
    alertFeed = alertFeed.filter(a => a.id !== id);
    initNotificationCenter();
    loadAlertsCenterView();
}

function clearAllNotifications() {
    alertFeed = [];
    initNotificationCenter();
    loadAlertsCenterView();
}

// --- 10. Global Search Input Controller ---
function initSearch() {
    const input = document.getElementById("global-search-input");
    const dropdown = document.getElementById("search-dropdown-results");

    input.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = '';
        dropdown.style.display = 'block';

        // 1. Search Repeat Offenders
        const matchedOffenders = repeatOffenders.filter(o => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
        
        // 2. Search FIR Records
        const matchedRecords = crimeRecords.filter(r => r.firNumber.toLowerCase().includes(q) || r.offenderName.toLowerCase().includes(q) || r.district.toLowerCase().includes(q)).slice(0, 5);

        // 3. Search Districts
        const matchedDistricts = Object.keys(DISTRICTS_GEO).filter(d => d.toLowerCase().includes(q));

        let hasResults = false;

        // Render Offender matches
        if (matchedOffenders.length > 0) {
            hasResults = true;
            const sec = document.createElement("div");
            sec.className = "search-results-section";
            sec.innerHTML = `<div class="search-results-title">CRIMINAL PROFILES</div>`;
            matchedOffenders.forEach(o => {
                const item = document.createElement("div");
                item.className = "search-result-item";
                item.onclick = () => {
                    dropdown.style.display = 'none';
                    navigateToView('offenders');
                    selectOffender(o.id);
                };
                item.innerHTML = `
                    <span class="item-title">${o.name}</span>
                    <span class="item-desc font-telemetry">${o.id} - ${o.district} | Risk: ${o.recidivismScore}%</span>
                `;
                sec.appendChild(item);
            });
            dropdown.appendChild(sec);
        }

        // Render FIR matches
        if (matchedRecords.length > 0) {
            hasResults = true;
            const sec = document.createElement("div");
            sec.className = "search-results-section";
            sec.innerHTML = `<div class="search-results-title">INCIDENT RECORDS</div>`;
            matchedRecords.forEach(r => {
                const item = document.createElement("div");
                item.className = "search-result-item";
                item.onclick = () => {
                    dropdown.style.display = 'none';
                    navigateToView('records');
                    inspectIncident(r.firNumber);
                };
                item.innerHTML = `
                    <span class="item-title font-telemetry cyan-text">${r.firNumber}</span>
                    <span class="item-desc">${r.crimeType} in ${r.district} | ${r.offenderName}</span>
                `;
                sec.appendChild(item);
            });
            dropdown.appendChild(sec);
        }

        // Render District matches
        if (matchedDistricts.length > 0) {
            hasResults = true;
            const sec = document.createElement("div");
            sec.className = "search-results-section";
            sec.innerHTML = `<div class="search-results-title">GIS JURISDICTIONS</div>`;
            matchedDistricts.forEach(d => {
                const item = document.createElement("div");
                item.className = "search-result-item";
                item.onclick = () => {
                    dropdown.style.display = 'none';
                    navigateToView('map-view');
                    setTimeout(() => {
                        const geo = DISTRICTS_GEO[d];
                        if (gisMap) {
                            gisMap.setView([geo.lat, geo.lng], 9);
                        }
                    }, 200);
                };
                item.innerHTML = `
                    <span class="item-title">${d} District</span>
                    <span class="item-desc font-telemetry">Risk Level: ${DISTRICTS_GEO[d].risk} | ${DISTRICTS_GEO[d].crimes} records</span>
                `;
                sec.appendChild(item);
            });
            dropdown.appendChild(sec);
        }

        if(!hasResults) {
            dropdown.innerHTML = `<div style="padding:15px; font-size:11px; text-align:center; color:rgba(255,255,255,0.4);">No database records matched your search query.</div>`;
        }
    });

    // Close dropdown on click outside
    document.addEventListener("click", (e) => {
        if(e.target !== input) {
            dropdown.style.display = 'none';
        }
    });
}

// --- Action Button Callbacks ---
function triggerAIDecisionReport() {
    navigateToView('reports');
    // Set to AI strategic recommendations brief template
    document.getElementById("report-type-select").value = 'ai-rec';
    generateSelectedReport();
}

function exportFullDashboard() {
    alert("Exporting Dashboard Metrics... Console snapshot shared securely via KSP SMTP nodes.");
}

function exportDataExcel() {
    alert("Exporting FIR Records to Excel spreadsheet format completed. File KSP_Incidents_Log.csv downloaded.");
    exportReportCSV();
}

function exportDataPDF() {
    alert("Compiling Printable PDF Document structure... Document ready in print queue.");
    window.print();
}

function runConsoleDiagnostic() {
    alert("Console System Diagnostics:\n"
        + "1. AI Sync Connection: OK\n"
        + "2. GIS Tile Stream: OK\n"
        + "3. State database replication latency: 12ms (Target < 200ms)\n"
        + "All systems functioning nominal. Security Level: SECRET.");
}

function resetAppDatabase() {
    if(confirm("Confirm reset of application local registers back to primary state? All overrides will be overwritten.")) {
        generateMockDatabase();
        if(activeView === 'dashboard') loadDashboardView();
        else navigateToView(activeView);
        alert("Mock database realignment and registration reload successfully completed.");
    }
}
