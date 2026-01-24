// --- App State ---
let appState = {}; // Estado principal (eventos, drags, banner, etc.) - Cargado desde PHP_INITIAL_STATE
let allTickets = []; // Array para todas las entradas - Cargado desde PHP_INITIAL_TICKETS
let allMerchSales = []; // Array para las ventas de merch - Cargado desde PHP_INITIAL_MERCH_SALES

let isLoggedIn = false; // Estado de autenticación - Determinado por PHP_IS_LOGGED_IN y sesión
let adminEmail = ''; // Email del admin logueado - Obtenido de PHP_ADMIN_EMAIL
let pendingEventId = null;
let editingEventId = null;
let editingDragId = null;
let editingMerchItemId = null;
let currentAdminMerchDragId = null;

let adminTapCounter = 0; // Para el Easter Egg

// --- NUEVO: Estado del Modal de Galería ---
let currentImageModalGallery = [];
let currentImageModalIndex = 0;
// --- FIN NUEVO ---

// --- Server Storage Functions (PHP Endpoints) ---
const SAVE_APP_STATE_URL = 'save.php';
const SAVE_TICKETS_URL = 'save_tickets.php';
const SAVE_MERCH_SALES_URL = 'save_merch_sales.php';
const UPLOAD_URL = 'upload.php';
const LOGIN_URL = 'login.php';
const LOGOUT_URL = 'logout.php';

/**
 * Carga los datos iniciales proporcionados por PHP en index.php.
 */
/**
 * Carga los datos iniciales proporcionados por PHP en index.php.
 */
function loadInitialDataFromServer() {
	try {
		// Cargar App State (datos_app.json)
		if (window.PHP_INITIAL_STATE) {
			appState = window.PHP_INITIAL_STATE;
			console.log("App state cargado desde servidor:", appState);

		} else {
			// Si PHP no pudo cargar datos_app.json, appState permanecerá vacío o con el objeto {} inicial.
			// La app debería manejar este caso (mostrar mensaje o usar valores mínimos seguros).
			console.warn("No se encontró estado principal (datos_app.json) en el servidor o estaba vacío. AppState puede estar incompleto.");
			// Asegurar estructuras mínimas si faltan por completo
			appState.events = appState.events || [];
			appState.drags = appState.drags || [];
			appState.webMerch = appState.webMerch || []; // NUEVO: Merch de la web
			appState.allowedDomains = appState.allowedDomains || [];
			appState.scannedTickets = appState.scannedTickets || {};
			appState.nextEventId = appState.nextEventId || 1;
			appState.nextDragId = appState.nextDragId || 1;
			appState.nextMerchItemId = appState.nextMerchItemId || 1;
		}

		// Cargar Tickets (entradas_db.json)
		if (window.PHP_INITIAL_TICKETS && Array.isArray(window.PHP_INITIAL_TICKETS)) {
			allTickets = window.PHP_INITIAL_TICKETS;
			console.log("Ticket state cargado desde servidor:", allTickets);
		} else {
			allTickets = [];
			console.warn("No se encontró estado de entradas (entradas_db.json) en el servidor o estaba vacío/inválido.");
		}

		// Cargar Ventas de Merch (merch_vendido.json)
		if (window.PHP_INITIAL_MERCH_SALES && Array.isArray(window.PHP_INITIAL_MERCH_SALES)) {
			allMerchSales = window.PHP_INITIAL_MERCH_SALES;
			console.log("Merch Sales state cargado desde servidor:", allMerchSales);
		} else {
			allMerchSales = [];
			console.warn("No se encontró estado de ventas de merch (merch_vendido.json) en el servidor o estaba vacío/inválido.");
		}

		// Cargar Estado de Login (desde session.php via index.php)
		isLoggedIn = window.PHP_IS_LOGGED_IN === true;
		adminEmail = window.PHP_ADMIN_EMAIL || '';
		console.log(`Estado inicial de login: ${isLoggedIn ? `Logueado como ${adminEmail}` : 'No logueado'}`);

		// --- NUEVO: Sincronizar contadores al cargar ---
		syncTicketCounters();
		// --- FIN NUEVO ---


	} catch (e) {
		console.error("Error crítico procesando datos iniciales desde PHP:", e);
		// En un caso real, podrías mostrar un error fatal al usuario aquí.
		// Por ahora, inicializamos a estados vacíos/seguros.
		appState = { events: [], _drags: [], webMerch: [], allowedDomains: [], scannedTickets: {}, nextEventId: 1, nextDragId: 1, nextMerchItemId: 1 };
		allTickets = [];
		allMerchSales = [];
		isLoggedIn = false;
		adminEmail = '';
		showInfoModal("Error grave al cargar datos iniciales. La aplicación puede no funcionar correctamente.", true);
	}
}
/**
	 * NUEVO: Sincroniza los contadores 'ticketsSold' en appState.events
	 * con los datos reales de 'allTickets'.
	 * Esto corrige discrepancias al cargar la app.
	 */
function syncTicketCounters() {
	if (!appState || !appState.events || !allTickets) return;

	console.log("Sincronizando contadores de entradas...");
	let discrepanciesFound = 0;
	appState.events.forEach(event => {
		// Calcular el total real de entradas vendidas para este evento
		const realTotalQuantity = allTickets
			.filter(t => t.eventId === event.id)
			.reduce((sum, t) => sum + (t.quantity || 0), 0);

		// Comparar y corregir si hay discrepancia
		if (event.ticketsSold !== realTotalQuantity) {
			console.warn(`Corrigiendo discrepancia para evento ${event.id} ('${event.name}'): appState tenía ${event.ticketsSold}, el real es ${realTotalQuantity}.`);
			event.ticketsSold = realTotalQuantity; // Corregir en memoria
			discrepanciesFound++;
		}
	});

	if (discrepanciesFound > 0) {
		console.log(`Se corrigieron ${discrepanciesFound} contadores de eventos.`);
	} else {
		console.log("Contadores de entradas ya estaban sincronizados.");
	}
}


// --- File Reader Helpers (sin cambios) ---


// --- File Reader Helpers (sin cambios) ---

function readFileAsDataURL(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}
function readFileAsText(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsText(file);
	});
}
function readFileAsArrayBuffer(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsArrayBuffer(file);
	});
}


// --- WRAP ALL LOGIC IN DOMCONTENTLOADED ---
window.addEventListener('DOMContentLoaded', async () => {

	loadInitialDataFromServer(); // Carga datos iniciales desde PHP

	// Referenciar currentEvents DESPUÉS de cargar appState
	let currentEvents = [...(appState.events || [])];

	// --- NUEVO: IntersectionObserver para scroll reveal ---
	const observerOptions = {
		root: null,
		rootMargin: '50px',
		threshold: 0.1
	};

	const observer = new IntersectionObserver((entries, observer) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.classList.add('visible');
				observer.unobserve(entry.target); // Stop observing for performance
			}
		});
	}, observerOptions);

	function observeRevealElements() {
		document.querySelectorAll('.reveal-on-scroll').forEach(el => {
			observer.observe(el);
		});
	}
	// --- FIN NUEVO ---

	// --- DOM Elements (referencias sin cambios, solo asegurar que existen en HTML) ---
	const pages = {};
	const adminPages = {};
	const adminNavLinks = {};
	const mobileNavLinks = {};
	const bottomPillNavLinks = {}; // NUEVO: Enlaces de la barra inferior
	const navActiveIndicator = document.querySelector('.nav-active-indicator');
	const loadingModal = document.getElementById('loading-modal');
	// ... (otros selectores sin cambios) ...

	// ... (dentro de DOMContentLoaded, alrededor linea 270) ...
	// Rellenar mapas de elementos
	document.querySelectorAll('[data-page]').forEach(el => pages[el.dataset.page] = el);
	document.querySelectorAll('[data-admin-page]').forEach(el => adminPages[el.dataset.adminPage] = el);
	document.querySelectorAll('#admin-nav [data-nav]').forEach(el => adminNavLinks[el.dataset.nav] = el);

	// NUEVO: Pilla los links de la barra inferior
	document.querySelectorAll('#bottom-pill-nav [data-nav]').forEach(el => bottomPillNavLinks[el.dataset.nav] = el);

	// Mobile menu (drawer) links
	document.querySelectorAll('#mobile-menu a[data-nav]').forEach(el => mobileNavLinks[el.dataset.nav] = el);

	// General click listener for navigation
	document.querySelectorAll('[data-nav]').forEach(link => {
		link.addEventListener('click', (e) => {
			e.preventDefault();
			const navTarget = link.dataset.nav;

			console.log('Navegando a:', navTarget);

			if (navTarget === 'admin') {
				// Toggle admin panel
				if (adminPanel.classList.contains('hidden')) {
					adminPanel.classList.remove('hidden');
					// Default to events tab if just opening
					switchAdminTab('events');
				} else {
					adminPanel.classList.add('hidden');
				}
				// Close mobile menu if open
				mobileMenu.classList.add('hidden');
			} else {
				// Hide admin panel if going to main pages
				adminPanel.classList.add('hidden');
				showPage(navTarget);
			}
		});
	});


	// ... (resto) ...

	/**
	 * Actualiza la posición y ancho del indicador de la barra de navegación.
	 */
	function updateNavIndicator(pageId) {
		const activeItem = bottomPillNavLinks[pageId];
		if (activeItem && navActiveIndicator) {
			const rect = activeItem.getBoundingClientRect();
			const parentRect = activeItem.parentElement.getBoundingClientRect();

			// Calcular posición relativa al padre
			const left = rect.left - parentRect.left;
			const width = rect.width;

			navActiveIndicator.style.left = `${left}px`;
			navActiveIndicator.style.width = `${width}px`;
		}
	}

	// --- Page Navigation (Updated for Pill Nav) ---
	function showPage(pageId) {
		Object.values(pages).forEach(page => {
			page.classList.add('hidden');
			page.classList.remove('page-fade-in');
		});
		if (pages[pageId]) {
			pages[pageId].classList.remove('hidden');
			void pages[pageId].offsetWidth; // Trigger reflow for animation
			pages[pageId].classList.add('page-fade-in');
		} else {
			console.warn(`Página "${pageId}" no encontrada. Mostrando 'home'.`);
			if (pages['home']) {
				pages['home'].classList.remove('hidden');
				pages['home'].classList.add('page-fade-in');
				pageId = 'home';
			}
		}

		// Update Mobile Drawer Links
		Object.values(mobileNavLinks).forEach(link => {
			link.classList.remove('bg-gray-700', 'text-white');
			link.classList.add('text-gray-300');
		});
		if (mobileNavLinks[pageId]) {
			mobileNavLinks[pageId].classList.add('bg-gray-700', 'text-white');
			mobileNavLinks[pageId].classList.remove('text-gray-300');
		}

		// Update Bottom Pill Nav Links
		Object.values(bottomPillNavLinks).forEach(link => {
			link.classList.remove('active');
		});
		if (bottomPillNavLinks[pageId]) {
			bottomPillNavLinks[pageId].classList.add('active');
			updateNavIndicator(pageId); // Mover el indicador
		}

		mobileMenu?.classList.add('hidden');

		// Render dynamic content
		if (pageId === 'events') renderPublicEvents(currentEvents);
		if (pageId === 'merch') renderMerchPage();
		if (pageId === 'gallery') renderGalleryEventList();
		if (pageId === 'drags') renderDragList();
		if (pageId === 'home') {
			renderPastGalleries(currentEvents);
			renderHomeEvents(currentEvents);
			renderBannerVideo();
			renderAppLogo();
			renderNextEventPromo();
		}

		// Mostrar panel admin o login si se navega a 'admin'
		if (pageId === 'admin') {
			checkAdminUI();
		}

		window.scrollTo({ top: 0, behavior: 'smooth' });
	} const nextEventPromoContainer = document.getElementById('next-event-promo-container');
	const eventListContainer = document.getElementById('event-list-container');
	const nextEventPromo = document.getElementById('next-event-promo');
	const homeEventListContainer = document.getElementById('home-event-list-container');
	const viewAllEventsBtn = document.getElementById('view-all-events-btn');
	const pastGalleriesGrid = document.getElementById('past-galleries-grid');
	const homeBannerContainer = document.getElementById('home-banner-container');
	const mobileMenuBtn = document.getElementById('mobile-menu-btn');
	const mobileMenu = document.getElementById('mobile-menu');
	const loginForm = document.getElementById('login-form');
	const adminPanel = document.getElementById('admin-panel');
	const logoutBtn = document.getElementById('logout-btn');
	const addEventForm = document.getElementById('add-event-form');
	const addEventFormButton = document.getElementById('add-event-form-button');
	const clearEventFormButton = document.getElementById('clear-event-form-button');
	const adminEventListUl = document.getElementById('admin-events-list-ul');
	const eventPosterUrlInput = document.getElementById('event-poster-url');
	const eventPosterUploadInput = document.getElementById('event-poster-upload');
	const contentManageForm = document.getElementById('content-manage-form');
	const bannerUrlInput = document.getElementById('banner-url');
	const bannerUploadInput = document.getElementById('banner-upload');
	const promoEnableCheckbox = document.getElementById('promo-enable');
	const promoTextInput = document.getElementById('promo-text');
	const promoNeonColorInput = document.getElementById('promo-neon-color'); // <-- AÑADIR ESTA LÍNEA
	const backupBtn = document.getElementById('backup-btn');
	const restoreInput = document.getElementById('restore-input');
	const galleryManageForm = document.getElementById('gallery-manage-form');
	const galleryEventSelect = document.getElementById('gallery-event-select');
	const galleryUrlsInput = document.getElementById('gallery-urls-input');
	const galleryUploadInput = document.getElementById('gallery-upload');
	const addUploadedImagesBtn = document.getElementById('add-uploaded-images-btn');
	const galleryEventListContainer = document.getElementById('gallery-event-list-container');
	const adminGalleryPreviewGrid = document.getElementById('admin-gallery-preview-grid'); // <-- AÑADIR ESTA LÍNEA
	const galleryImageViewContainer = document.getElementById('gallery-image-view-container');
	const galleryImageViewGrid = document.getElementById('gallery-image-view-grid');
	const galleryImageViewTitle = document.getElementById('gallery-image-view-title');
	const galleryBackBtn = document.getElementById('gallery-back-btn');
	// --- Estas líneas NUEVAS debes AÑADIRLAS ---
	const scanQrBtn = document.getElementById('scan-qr-btn');
	const adminMainView = document.getElementById('admin-main-view');
	const adminScannerView = document.getElementById('admin-scanner-view');
	const scanBackBtn = document.getElementById('scan-back-btn');

	// --- NUEVO: Elementos para html5-qrcode ---
	const scannerMessage = document.getElementById('scanner-message'); // Mensajes de estado
	const scannerVideoRegion = document.getElementById('scanner-video-region'); // Contenedor del vídeo
	const scannerInputView = document.getElementById('scanner-input-view'); // Modal de confirmación
	const scannerInputMessage = document.getElementById('scanner-input-message'); // Mensaje en modal confirmación
	const scannerQuantityInput = document.getElementById('scanner-quantity-input'); // Input cantidad
	const scannerConfirmBtn = document.getElementById('scanner-confirm-btn'); // Botón confirmar
	const scannerCancelBtn = document.getElementById('scanner-cancel-btn'); // Botón cancelar
	const scannerCloseBtn = document.getElementById('scanner-close-btn'); // NUEVO: Botón cerrar

	// Esta es la variable principal que controlará el nuevo escáner
	let html5QrCodeScanner = null;

	// Esta variable sigue siendo necesaria para guardar los datos entre escaneo y confirmación
	let currentScannedTicketInfo = null;
	// --- FIN NUEVO ---
	// --- FIN NUEVO ---
	const giveawayEventListUl = document.getElementById('giveaway-events-list-ul');
	const giveawayWinnerResult = document.getElementById('giveaway-winner-result');
	const ticketModal = document.getElementById('ticket-modal');
	const ticketToDownload = document.getElementById('ticket-to-download');
	// NUEVO: Añadido selector para nombre en ticket modal
	const ticketHolderName = document.getElementById('ticket-holder-name');
	const ticketEventName = document.getElementById('ticket-event-name');
	const ticketEventDate = document.getElementById('ticket-event-date');
	const ticketQuantityDetails = document.getElementById('ticket-quantity-details');
	const ticketQrCode = document.getElementById('ticket-qr-code');
	const downloadTicketBtn = document.getElementById('download-ticket-btn');
	const ticketListModal = document.getElementById('ticket-list-modal');
	const ticketListTitle = document.getElementById('ticket-list-title');
	const ticketListContent = document.getElementById('ticket-list-content');
	const emailModal = document.getElementById('email-modal');
	const emailForm = document.getElementById('email-form');


	const headerLogoImg = document.getElementById('header-logo-img');
	const appLogoUrlInput = document.getElementById('app-logo-url');
	const appLogoUploadInput = document.getElementById('app-logo-upload');
	const ticketLogoUrlInput = document.getElementById('ticket-logo-url');
	const ticketLogoUploadInput = document.getElementById('ticket-logo-upload');

	const dragListContainer = document.getElementById('drag-list-container');
	const dragGalleryViewContainer = document.getElementById('drag-gallery-view-container');
	const dragGalleryBackBtn = document.getElementById('drag-gallery-back-btn');
	const dragGalleryViewTitle = document.getElementById('drag-gallery-view-title');
	const dragGalleryViewGrid = document.getElementById('drag-gallery-view-grid');
	const imageModal = document.getElementById('image-modal');
	const imageModalContent = document.getElementById('image-modal-content');
	let imageModalPrevBtn = document.getElementById('image-modal-prev');
	let imageModalNextBtn = document.getElementById('image-modal-next');

	const addDragForm = document.getElementById('add-drag-form');
	const addDragFormButton = document.getElementById('add-drag-form-button');
	const clearDragFormButton = document.getElementById('clear-drag-form-button');
	const adminDragListUl = document.getElementById('admin-drags-list-ul');
	const dragCoverUrlInput = document.getElementById('drag-cover-url');
	const dragCoverUploadInput = document.getElementById('drag-cover-upload');
	const dragGalleryUrlsInput = document.getElementById('drag-gallery-urls');
	const dragGalleryUploadInput = document.getElementById('drag-gallery-upload');
	const addDragGalleryUploadBtn = document.getElementById('add-drag-gallery-upload-btn');
	const adminDragGalleryPreviewGrid = document.getElementById('admin-drag-gallery-preview-grid'); // <-- AÑADIR ESTA LÍNEA

	// --- DOM Elements Admin Merch (sin cambios) ---
	const adminMerchSelectDrag = document.getElementById('admin-merch-select-drag');
	const adminMerchListContainer = document.getElementById('admin-merch-list-container');
	const addMerchItemForm = document.getElementById('add-merch-item-form');
	const addMerchItemFormButton = document.getElementById('add-merch-item-form-button');
	const clearMerchItemFormButton = document.getElementById('clear-merch-item-form-button');
	const merchItemImageUrlInput = document.getElementById('merch-item-image-url');
	const merchItemImageUploadInput = document.getElementById('merch-item-image-upload');
	// --- FIN ---

	// --- DOM Elements Merch Público (sin cambios funcionales, solo añadir holder name) ---
	const merchGalleryModal = document.getElementById('merch-gallery-modal');
	const merchGalleryTitle = document.getElementById('merch-gallery-title');
	const merchGalleryContent = document.getElementById('merch-gallery-content');
	const merchPurchaseModal = document.getElementById('merch-purchase-modal');
	const merchPurchaseForm = document.getElementById('merch-purchase-form');
	const merchPurchaseItemName = document.getElementById('merch-purchase-item-name');
	const merchQrModal = document.getElementById('merch-qr-modal');
	const merchQrToDownload = document.getElementById('merch-qr-to-download');
	// NUEVO: Selector para nombre en QR de merch
	const merchHolderName = document.getElementById('merch-holder-name');
	const merchQrLogoImg = document.getElementById('merch-qr-logo-img');
	const merchQrDragName = document.getElementById('merch-qr-drag-name');
	const merchQrItemName = document.getElementById('merch-qr-item-name');
	const merchQrQuantity = document.getElementById('merch-qr-quantity');
	const merchQrCode = document.getElementById('merch-qr-code');
	const downloadMerchQrBtn = document.getElementById('download-merch-qr-btn');
	// --- FIN ---

	// --- DOM Elements Admin Merch Sales (sin cambios) ---
	const adminMerchSalesSummary = document.getElementById('admin-merch-sales-summary');
	const adminMerchTotalItems = document.getElementById('admin-merch-total-items');
	const adminMerchTotalRevenue = document.getElementById('admin-merch-total-revenue');
	const adminMerchViewSalesBtn = document.getElementById('admin-merch-view-sales-btn');
	const merchSalesListModal = document.getElementById('merch-sales-list-modal');
	const merchSalesListTitle = document.getElementById('merch-sales-list-title');
	const merchSalesListContent = document.getElementById('merch-sales-list-content');
	// --- FIN ---

	// --- DOM Elements for NEW Web Merch System ---
	const addWebMerchBtn = document.getElementById('add-web-merch-btn');
	const webMerchForm = document.getElementById('web-merch-form');
	const saveWebMerchBtn = document.getElementById('save-web-merch-btn');
	const cancelWebMerchBtn = document.getElementById('cancel-web-merch-btn');
	const webMerchListContainer = document.getElementById('admin-web-merch-list-container');
	const webMerchImageUrlInput = document.getElementById('web-merch-image-url');
	const webMerchImageUploadInput = document.getElementById('web-merch-image-upload');
	const webMerchSalesSummary = document.getElementById('web-merch-sales-summary');
	const webMerchTotalItems = document.getElementById('web-merch-total-items');
	const webMerchTotalRevenue = document.getElementById('web-merch-total-revenue');
	const webMerchViewSalesBtn = document.getElementById('web-merch-view-sales-btn');
	// --- FIN ---

	// --- DOM Elements for NEW Drag Merch System ---
	const dragMerchSelectDrag = document.getElementById('drag-merch-select-drag');
	const addDragMerchBtn = document.getElementById('add-drag-merch-btn'); // NUEVO: Botón añadir
	const dragMerchForm = document.getElementById('drag-merch-form');
	const saveDragMerchBtn = document.getElementById('save-drag-merch-btn');
	const cancelDragMerchBtn = document.getElementById('cancel-drag-merch-btn');
	const dragMerchListContainer = document.getElementById('drag-merch-list-container');
	const dragMerchImageUrlInput = document.getElementById('drag-merch-image-url');
	const dragMerchImageUploadInput = document.getElementById('drag-merch-image-upload');
	const dragMerchSalesSummary = document.getElementById('drag-merch-sales-summary');
	const dragMerchTotalItems = document.getElementById('drag-merch-total-items');
	const dragMerchTotalRevenue = document.getElementById('drag-merch-total-revenue');
	const dragMerchViewSalesBtn = document.getElementById('drag-merch-view-sales-btn');
	// --- FIN ---

	// --- DOM Elements for SMTP Configuration ---
	const smtpConfigForm = document.getElementById('smtp-config-form');
	const testSMTPBtn = document.getElementById('test-smtp-btn');
	const webMerchNotifEmail = document.getElementById('web-merch-notif-email');
	const webMerchBuyerTemplate = document.getElementById('web-merch-buyer-template');
	const dragEmailSelect = document.getElementById('drag-email-select');
	const dragEmailConfigForm = document.getElementById('drag-email-config-form');
	const dragNotifEmail = document.getElementById('drag-notif-email');
	const dragBuyerTemplate = document.getElementById('drag-buyer-template');
	const saveDragEmailConfigBtn = document.getElementById('save-drag-email-config-btn');
	const saveWebMerchConfigBtn = document.getElementById('save-web-merch-config-btn'); // NUEVO
	// --- FIN ---


	// --- Helper Functions ---

	/**
	 * Inicia el intervalo para actualizar las cuentas atrás de los eventos.
	 */
	function startEventCountdowns() {
		if (window.eventCountdownInterval) clearInterval(window.eventCountdownInterval);

		const updateCountdowns = () => {
			const now = new Date().getTime();
			document.querySelectorAll('.event-countdown').forEach(el => {
				const dateStr = el.dataset.date;
				if (!dateStr) return;

				const targetDate = new Date(dateStr).getTime();
				const distance = targetDate - now;

				if (distance < 0) {
					el.innerHTML = "¡ES HOY!";
					el.classList.add('animate-pulse');
					return;
				}

				const days = Math.floor(distance / (1000 * 60 * 60 * 24));
				const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
				const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
				const seconds = Math.floor((distance % (1000 * 60)) / 1000);

				// Formato compacto y pequeño, pero con color neon
				el.innerHTML = `<span class="text-[#F02D7D] font-bold text-xs" style="text-shadow: 0 0 2px #F02D7D;">FALTAN:</span> <span class="text-[#00FFFF] font-bold ml-1 text-glow-cyan">${days}d ${hours}h ${minutes}m ${seconds}s</span>`;
			});
		};

		updateCountdowns(); // Ejecutar inmediatamente
		window.eventCountdownInterval = setInterval(updateCountdowns, 1000);
	}

	/**
	 * Baraja un array usando el algoritmo Fisher-Yates.
	 */
	function shuffleArray(array) {
		const newArray = [...array];
		for (let i = newArray.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[newArray[i], newArray[j]] = [newArray[j], newArray[i]];
		}
		return newArray;
	}



	function showAdminPage(adminPageId) {
		Object.values(adminPages).forEach(page => page.classList.add('hidden'));
		if (adminPages[adminPageId]) {
			adminPages[adminPageId].classList.remove('hidden');
		} else {
			console.warn(`Admin page "${adminPageId}" not found. Showing 'events'.`);
			if (adminPages['events']) adminPages['events'].classList.remove('hidden');
			adminPageId = 'events'; // Corregir para estilos
		}

		Object.values(adminNavLinks).forEach(link => {
			link.classList.remove('bg-white', 'text-black');
			link.classList.add('bg-gray-700', 'text-white', 'hover:bg-gray-600');
		});
		if (adminNavLinks[adminPageId]) {
			adminNavLinks[adminPageId].classList.add('bg-white', 'text-black');
			adminNavLinks[adminPageId].classList.remove('bg-gray-700', 'text-white', 'hover:bg-gray-600');
		}

		// Re-renderizar contenido dinámico de admin al cambiar de pestaña
		if (adminPageId === 'events') {
			renderAdminEvents(currentEvents); // Usa la variable local actualizada
		}
		if (adminPageId === 'drags') {
			renderAdminDrags(appState.drags);
		}
		if (adminPageId === 'merch') {
			renderAdminMerch();
			// NUEVO: Renderizar el nuevo sistema dual de merch
			renderWebMerchList();
			renderWebMerchSalesSummary();
			renderDragMerchSelect();
			renderDragMerchSalesSummary();
		}

		if (adminPageId === 'smtp') {
			renderSMTPConfig(); // Cargar configuración del servidor
			renderEmailNotifications();
		}

		if (adminPageId === 'giveaway') {
			renderGiveawayEvents(currentEvents); // Usa la variable local actualizada
		}
		if (adminPageId === 'gallery' || adminPageId === 'content') {
			loadContentToAdmin();
		}

		// Resetear formularios si se sale de su pestaña y se estaba editando
		if (adminPageId !== 'events' && editingEventId !== null) {
			resetEventForm();
		}
		if (adminPageId !== 'drags' && editingDragId !== null) {
			resetDragForm();
		}
		if (adminPageId !== 'merch' && editingMerchItemId !== null) {
			resetMerchItemForm();
		}

		if (adminPageId === 'merch') {
			renderAdminMerch(); // Renderiza el select de draggable
			renderWebMerchList(); // NUEVO: Renderiza lista de web merch
			renderWebMerchSalesSummary(); // NUEVO: Renderiza resumen ventas
			renderDragMerchSalesSummary();
		}

		// --- NUEVO: Scroll al inicio al cambiar de pestaña admin ---
		window.scrollTo({ top: 0, behavior: 'instant' });
	}
	/**
	 * Guarda el estado principal de la aplicación (eventos, drags, config) en el servidor.
	 * Requiere que el usuario esté autenticado (gestionado por PHP).
	 */
	/**
	 * Guarda el estado principal de la aplicación (eventos, drags, config) en el servidor.
	 * Requiere que el usuario esté autenticado (gestionado por PHP).
	 */
	async function saveAppState() {
		try {
			// Prepara los datos a guardar
			const stateToSave = {
				appLogoUrl: appState.appLogoUrl,
				ticketLogoUrl: appState.ticketLogoUrl,
				bannerVideoUrl: appState.bannerVideoUrl,
				promoEnabled: appState.promoEnabled,
				promoCustomText: appState.promoCustomText,
				promoNeonColor: appState.promoNeonColor, // <-- AÑADIDO
				emailNotifications: appState.emailNotifications || {}, // <-- AÑADIDO: Persistencia de notificaciones
				webMerch: appState.webMerch || [], // <-- AÑADIDO: Persistencia de Merch Web
				allowedDomains: appState.allowedDomains || [], // Asegurar array
				events: (appState.events || []).map(event => {
					// Excluir datos temporales si los hubiera
					const { purchasedTickets, ...eventToSave } = event;
					return eventToSave;
				}),
				drags: appState.drags || [], // Asegurar array
				nextEventId: appState.nextEventId || 1, // Asegurar valor
				nextDragId: appState.nextDragId || 1, // Asegurar valor
				nextMerchItemId: appState.nextMerchItemId || 1, // Asegurar valor
				scannedTickets: appState.scannedTickets || {} // Asegurar objeto
			};

			const response = await fetch(SAVE_APP_STATE_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(stateToSave)
			});

			const result = await response.json(); // Siempre intentar parsear JSON

			if (!response.ok) {
				// Manejar errores HTTP y errores específicos de PHP (como 403 Forbidden si no está logueado)
				let errorMessage = `Error HTTP ${response.status}.`;
				if (response.status === 403) {
					errorMessage = "Acceso denegado. Tu sesión puede haber expirado.";
					// Opcional: Desloguear al usuario en el frontend
					handleLogout(false); // Pasar false para no redirigir ni mostrar modal éxito
				} else if (result && result.message) {
					errorMessage = result.message;
				}
				throw new Error(errorMessage);
			}

			if (result.success) {
				console.log("App state guardado en el servidor:", stateToSave);
			} else {
				throw new Error(result.message || "El servidor reportó un error desconocido al guardar (appState).");
			}
		} catch (e) {
			console.error("Error guardando app state en el servidor:", e);
			showInfoModal("Error al guardar la configuración principal: " + e.message, true);
		}
	}

	/**
	 * Guarda el estado de las entradas en el servidor.
	 * Esta acción la puede realizar cualquier usuario (al comprar).
	 * MODIFICADO: Ahora puede ser llamado por admin al borrar entradas.
	 */
	/**
	 * Guarda el estado de las entradas en el servidor.
	 * Esta acción la puede realizar cualquier usuario (al comprar).
	 */
	async function saveTicketState() {
		try {
			const response = await fetch(SAVE_TICKETS_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(allTickets || []) // Enviar array vacío si no hay tickets
			});

			// Intenta obtener el texto de la respuesta ANTES de parsear JSON si falla
			if (!response.ok) {
				let errorText = await response.text(); // Leer como texto
				let errorMessage = `Error HTTP ${response.status}.`;
				try {
					// Intenta parsear como JSON si es posible (puede contener el mensaje de error de PHP)
					const errorResult = JSON.parse(errorText);
					if (errorResult && errorResult.message) {
						errorMessage = errorResult.message;
					}
				} catch (e) {
					// Si no es JSON, usa el texto directamente (o parte de él)
					errorMessage += ` Respuesta del servidor: ${errorText.substring(0, 100)}${errorText.length > 100 ? '...' : ''}`;
					console.error("Respuesta no JSON del servidor:", errorText);
				}
				throw new Error(errorMessage);
			}

			// Si la respuesta es OK (200), intenta parsear JSON
			const result = await response.json(); // Ahora debería funcionar si PHP está bien

			if (result.success) {
				console.log("Ticket state guardado en el servidor:", allTickets);
			} else {
				// Si PHP devolvió success: false pero con código 200
				throw new Error(result.message || "El servidor reportó un error desconocido al guardar (ticketState).");
			}
		} catch (e) {
			console.error("Error guardando ticket state en el servidor:", e);
			// MODIFICADO: Usar console.error aquí para evitar ReferenceError si showInfoModal falla en este contexto
			// showInfoModal("Error grave al guardar entradas: " + e.message, true);
			console.error("Fallo crítico al guardar estado de tickets:", e.message);

			// CORRECCIÓN: Ahora showInfoModal SÍ está en el ámbito, podemos llamarlo.
			if (typeof showInfoModal === 'function') {
				showInfoModal("Error grave al guardar la información de las entradas. Contacta al administrador.", true);
			}
		}
	}

	/**
	 * Guarda el estado de las ventas de merchandising en el servidor.
	 * Esta acción la puede realizar cualquier usuario (al comprar).
	 */
	async function saveMerchSalesState() {
		try {
			const response = await fetch(SAVE_MERCH_SALES_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(allMerchSales || []) // Enviar array vacío si no hay ventas
			});

			const result = await response.json(); // Siempre intentar parsear

			if (!response.ok) {
				let errorMessage = `Error HTTP ${response.status}.`;
				if (result && result.message) {
					errorMessage = result.message;
				}
				throw new Error(errorMessage);
			}

			if (result.success) {
				console.log("Merch Sales state guardado en el servidor:", allMerchSales);
			} else {
				throw new Error(result.message || "El servidor reportó un error desconocido al guardar (merchSalesState).");
			}
		} catch (e) {
			console.error("Error guardando merch sales state en el servidor:", e);
			// Similar a saveTicketState, logueamos pero no mostramos modal intrusivo tras compra.
			// Si es llamado por admin (ej. marcar entregado) y falla, se mostrará error allí.
		}
	}

	// --- Modals (sin cambios funcionales, solo asegurar que selectores existan) ---
	function showLoading(isLoading) {
		loadingModal?.classList.toggle('hidden', !isLoading);
	}
	let onInfoModalClose = null;
	function showInfoModal(message, isError = false, onClose = null) {
		if (!infoModal || !infoModalText) { alert(message); return; } // Fallback si no existe
		infoModalText.innerHTML = message;
		infoModalText.classList.toggle('text-red-400', isError);
		// Ajustar color éxito basado en mensajes comunes
		const successKeywords = ["éxito", "descargado", "confirmado", "actualizado", "añadido", "eliminado", "guardado"];
		const isSuccess = !isError && successKeywords.some(kw => message.toLowerCase().includes(kw));
		infoModalText.classList.toggle('text-green-400', isSuccess);
		// Default color si no es error ni éxito claro
		infoModalText.classList.toggle('text-gray-300', !isError && !isSuccess);

		infoModalText.classList.remove('text-left');
		infoModalText.classList.add('text-center');
		onInfoModalClose = onClose;
		infoModal.classList.remove('hidden');
	}

	function closeModal(modalId) {
		const modal = document.getElementById(modalId);
		modal?.classList.add('hidden');

		// Callback específico para info-modal
		if (modalId === 'info-modal' && onInfoModalClose) {
			try { onInfoModalClose(); } catch (e) { console.error("Error en callback de closeModal:", e); }
			onInfoModalClose = null;
		}

		// Limpieza específica para image-modal
		if (modalId === 'image-modal') {
			if (imageModalPrevBtn) imageModalPrevBtn.classList.add('hidden');
			if (imageModalNextBtn) imageModalNextBtn.classList.add('hidden');
			currentImageModalGallery = [];
			currentImageModalIndex = 0;
			if (imageModalContent) imageModalContent.src = ''; // Limpiar imagen
		}

		// Limpieza específica para modales de merch
		if (modalId === 'merch-gallery-modal') {
			clearDynamicListListeners('merchGalleryItems');
			if (merchGalleryContent) merchGalleryContent.innerHTML = ''; // Limpiar contenido
		}
		if (modalId === 'merch-purchase-modal' && merchPurchaseForm) {
			merchPurchaseForm.reset();
		}
		if (modalId === 'merch-qr-modal' && merchQrCode) {
			merchQrCode.innerHTML = ''; // Limpiar QR
		}
		if (modalId === 'merch-sales-list-modal') {
			clearDynamicListListeners('merchSalesList');
			if (merchSalesListContent) merchSalesListContent.innerHTML = ''; // Limpiar contenido
		}
		// Limpieza específica para ticket list
		if (modalId === 'ticket-list-modal') {
			clearDynamicListListeners('ticketListItems'); // Limpiar listeners de botones delete
			if (ticketListContent) ticketListContent.innerHTML = '';
		}
		// Limpieza específica para modal de email
		if (modalId === 'email-modal' && emailForm) {
			emailForm.reset();
		}
		// Limpieza específica para modal de ticket (QR)
		if (modalId === 'ticket-modal' && ticketQrCode) {
			ticketQrCode.innerHTML = '';
		}
	}

	function showImageModal(src, gallery = [], index = 0) {
		if (!imageModal || !imageModalContent) return;

		currentImageModalGallery = gallery;
		currentImageModalIndex = index;

		imageModalContent.src = src;
		imageModalContent.onerror = () => {
			// Usar un placeholder consistente
			imageModalContent.src = 'https://placehold.co/600x600/000/fff?text=Error+Imagen&font=vt323';
		};

		const showNav = gallery.length > 1;
		imageModalPrevBtn?.classList.toggle('hidden', !showNav);
		imageModalNextBtn?.classList.toggle('hidden', !showNav);

		imageModal.classList.remove('hidden');
	}

	function handleImageModalNext() {
		if (!imageModalContent || currentImageModalGallery.length === 0) return;
		currentImageModalIndex = (currentImageModalIndex + 1) % currentImageModalGallery.length;
		imageModalContent.src = currentImageModalGallery[currentImageModalIndex];
	}

	function handleImageModalPrev() {
		if (!imageModalContent || currentImageModalGallery.length === 0) return;
		currentImageModalIndex = (currentImageModalIndex - 1 + currentImageModalGallery.length) % currentImageModalGallery.length;
		imageModalContent.src = currentImageModalGallery[currentImageModalIndex];
	}
	// --- NUEVA FUNCIÓN ---
	/**
	 * Renderiza una rejilla de miniaturas con botones de borrar para galerías en admin.
	 * @param {string} containerId - ID del elemento contenedor de la rejilla (p.ej., 'admin-gallery-preview-grid').
	 * @param {string} hiddenInputId - ID del input oculto donde se guardan las URLs (p.ej., 'gallery-urls-input').
	 * @param {string[]} imageUrls - Array de URLs de las imágenes a mostrar.
	 */
	function renderAdminGalleryGrid(containerId, hiddenInputId, imageUrls) {
		const gridContainer = document.getElementById(containerId);
		const hiddenInput = document.getElementById(hiddenInputId);
		if (!gridContainer || !hiddenInput) {
			console.error(`Error: Contenedor (${containerId}) o input oculto (${hiddenInputId}) no encontrados.`);
			return;
		}

		// Limpiar listeners antiguos específicos de esta rejilla
		// Usaremos un identificador único para los listeners de borrado
		const listenerType = `delete-img-${containerId}`;
		clearDynamicListListeners(listenerType); // Modificaremos clearDynamicListListeners luego

		gridContainer.innerHTML = ''; // Limpiar rejilla

		if (!imageUrls || imageUrls.length === 0) {
			gridContainer.innerHTML = `<p class="text-gray-500 font-pixel text-center col-span-full self-center">No hay imágenes en esta galería.</p>`;
			hiddenInput.value = ''; // Asegurar que el input oculto esté vacío
			return;
		}

		// Actualizar el input oculto con las URLs actuales
		hiddenInput.value = imageUrls.join('\n');

		// Crear y añadir cada miniatura
		imageUrls.forEach((url, index) => {
			if (!url) return; // Saltar URLs vacías

			const item = document.createElement('div');
			item.className = 'admin-gallery-item';
			item.innerHTML = `
					<img src="${url}" alt="Miniatura ${index + 1}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/100x100/000/fff?text=Error&font=vt323';">
					<button type="button" class="delete-img-btn" data-url="${url}" data-index="${index}" title="Eliminar imagen">&times;</button>
				`;
			gridContainer.appendChild(item);

			// Añadir listener al botón de borrar
			const deleteBtn = item.querySelector('.delete-img-btn');
			if (deleteBtn) {
				// Añadir un listener que se pueda identificar y limpiar después
				addTrackedListener(deleteBtn, 'click', (e) => {
					e.preventDefault();
					const urlToDelete = e.currentTarget.dataset.url;
					// Filtrar la URL del array actual
					const updatedUrls = imageUrls.filter(imgUrl => imgUrl !== urlToDelete);
					// Volver a renderizar la rejilla con las URLs actualizadas
					renderAdminGalleryGrid(containerId, hiddenInputId, updatedUrls);
				}, listenerType); // Pasamos el tipo único
			}
		});
	}
	// --- FIN NUEVA FUNCIÓN ---

	// --- Event Listeners Management ---
	let allEventListeners = [];
	function clearEventListeners() {
		allEventListeners.forEach(({ element, type, handler }) => {
			try { element?.removeEventListener(type, handler); } catch (e) { console.warn("Could not remove listener", element, type, e); }
		});
		allEventListeners = [];
	}
	// MODIFICADO: Añadido 'ticketListItems' y manejo de listeners dinámicos de borrado de imágenes
	function clearDynamicListListeners(listType) {
		let classSelector = '';
		let dynamicTypePrefix = ''; // Para listeners con identificador único

		switch (listType) {
			case 'publicEvents': classSelector = '.get-ticket-btn, .gallery-link-btn'; break;
			case 'galleryList': classSelector = '.gallery-event-btn'; break;
			case 'eventGalleryImages': classSelector = '.event-gallery-img-btn'; break;
			case 'dragList': classSelector = '.drag-gallery-btn, .drag-instagram-btn, .drag-merch-btn'; break;
			case 'dragGalleryImages': classSelector = '.drag-gallery-img-btn'; break;
			case 'merchGalleryItems': classSelector = '.merch-buy-btn'; break;
			case 'merchSalesList': classSelector = '.mark-delivered-btn'; break;
			case 'adminDrags': classSelector = '.edit-drag-btn, .delete-drag-btn'; break;
			case 'adminMerchItems': classSelector = '.edit-merch-btn, .delete-merch-btn'; break;
			case 'pastGalleryList': classSelector = '.past-gallery-event-btn'; break;
			case 'adminEvents': classSelector = '.archive-event-btn, .edit-event-btn, .delete-event-btn, .view-tickets-btn'; break;
			case 'giveaway': classSelector = '.giveaway-btn'; break;
			case 'ticketListItems': classSelector = '.delete-ticket-btn'; break;
			// NUEVO: Manejo de listeners dinámicos de borrado de imágenes
			default:
				if (listType && listType.startsWith('delete-img-')) {
					classSelector = '.delete-img-btn'; // El botón de borrar
					dynamicTypePrefix = listType; // p.ej., 'delete-img-admin-gallery-preview-grid'
				} else {
					return; // Tipo desconocido, no hacer nada
				}
				break;
		}

		allEventListeners = allEventListeners.filter(({ element, type, handler, dynamicType }) => {
			let shouldRemove = false;
			if (element && typeof element.matches === 'function') {
				if (classSelector && element.matches(classSelector)) {
					// Si es un listener dinámico de borrado, verificar también el prefijo
					if (dynamicTypePrefix) {
						if (dynamicType === dynamicTypePrefix) {
							shouldRemove = true;
						}
					} else {
						// Para otros tipos, solo el selector de clase es suficiente
						shouldRemove = true;
					}
				}
			}

			if (shouldRemove) {
				try { element.removeEventListener(type, handler); } catch (e) { console.warn("Could not remove dynamic listener", element, type, e); }
				return false; // Remove from tracked listeners
			}
			return true; // Keep listener
		});
	}
	function addTrackedListener(element, type, handler, dynamicType = null) { // <-- AÑADIDO dynamicType
		if (!element) { console.warn("Attempted to add listener to null element", type, handler); return; }
		element.addEventListener(type, handler);
		allEventListeners.push({ element, type, handler, dynamicType }); // <-- AÑADIDO dynamicType
	}

	// --- Event & Content Rendering (funciones internas sin cambios estructurales, solo asegurar que usen `appState`) ---

	function renderAppLogo() {
		if (!headerLogoImg) return;
		// Usa el appState cargado, con fallback a una URL segura si falta
		const logoUrl = appState.appLogoUrl || 'https://placehold.co/200x80/000/fff?text=RODETES&font=vt323';
		headerLogoImg.src = logoUrl;
		headerLogoImg.onerror = () => { headerLogoImg.src = 'https://placehold.co/200x80/000/fff?text=Error+Logo&font=vt323'; };
	}

	function findNextUpcomingEvent(events) {
		if (!Array.isArray(events)) return null;
		const now = new Date();
		return events
			.filter(e => e && !e.isArchived && e.date && new Date(e.date) > now) // Más robusto
			.sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null; // Devolver null si no hay ninguno
	}

	function renderNextEventPromo() {
		// Asegurar que los elementos y datos existen
		if (!nextEventPromo || !nextEventPromoContainer || !appState) return;

		// Quitamos el span, el CSS se encarga del div .promo-banner-content
		// const span = nextEventPromo.querySelector('span');
		// if (!span) return;

		// Limpiar contenido anterior
		nextEventPromo.innerHTML = '';

		const nextEvent = findNextUpcomingEvent(currentEvents); // Usa la variable local actualizada
		const defaultColor = '#F02D7D';
		const isValidHex = (color) => color && /^#[0-9A-F]{6}$/i.test(color);
		const neonColor = isValidHex(appState.promoNeonColor) ? appState.promoNeonColor : defaultColor;

		if (nextEvent && appState.promoEnabled && appState.promoCustomText) {
			try {
				const eventDate = new Date(nextEvent.date);
				const shortDate = eventDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
				const fullDate = eventDate.toLocaleString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
				let promoText = appState.promoCustomText;
				promoText = promoText.replace('{eventName}', nextEvent.name || 'Evento');
				promoText = promoText.replace('{eventDate}', fullDate || 'Próximamente');
				promoText = promoText.replace('{eventShortDate}', shortDate || '??/??');
				promoText = promoText.replace('{eventPrice}', `${(nextEvent.price || 0).toFixed(2)}€`);

				// Aplicar el color neón a la variable CSS
				document.documentElement.style.setProperty('--promo-neon-color', neonColor);

				// Crear el span para el texto
				const span = document.createElement('span');
				span.textContent = promoText;
				nextEventPromo.appendChild(span);

				// Mostrar el banner y activar el layout
				nextEventPromoContainer.classList.add('promo-visible');
				document.body.classList.add('promo-active');

			} catch (e) {
				console.error("Error formateando fecha/promo:", e);
				// Ocultar banner si hay error
				nextEventPromoContainer.classList.remove('promo-visible');
				document.body.classList.remove('promo-active');
			}
		} else {
			// Ocultar el banner y desactivar el layout
			nextEventPromoContainer.classList.remove('promo-visible');
			document.body.classList.remove('promo-active');
		}
	}
	/**
	 * Renderiza los eventos destacados en la página de inicio.
	 * MODIFICADO: Imagen completa, imagen y título clicables.
	 */
	function renderHomeEvents(events) {
		clearDynamicListListeners('publicEvents');
		if (!homeEventListContainer) return;
		homeEventListContainer.innerHTML = ''; // Limpiar lista
		observeRevealElements(); // Reiniciar observador

		if (!Array.isArray(events)) {
			homeEventListContainer.innerHTML = '<p class="text-red-400 text-center col-span-full font-pixel">Error al cargar eventos.</p>';
			return;
		}

		const now = new Date();
		const activeEvents = events
			.filter(e => e && !e.isArchived && e.date && new Date(e.date) > now)
			.sort((a, b) => new Date(a.date) - new Date(b.date));
		const nextActiveEvent = activeEvents[0] || null;

		const pastEvents = events
			.filter(e => e && !e.isArchived && e.date && new Date(e.date) < now)
			.sort((a, b) => new Date(b.date) - new Date(a.date));
		const mostRecentPastEvent = pastEvents[0] || null;

		const eventsToShow = [nextActiveEvent, mostRecentPastEvent].filter(Boolean); // Filtrar nulos

		// Mostrar botón "Ver Todos" si hay más eventos no archivados que los mostrados
		const allNonArchivedEventsCount = events.filter(e => e && !e.isArchived).length;
		const viewAllEventsContainer = document.getElementById('view-all-events-container');
		if (viewAllEventsContainer) {
			viewAllEventsContainer.classList.toggle('hidden', allNonArchivedEventsCount <= eventsToShow.length);
		}

		if (eventsToShow.length === 0) {
			homeEventListContainer.innerHTML = '<p class="text-gray-400 text-center col-span-full font-pixel">NO HAY EVENTOS PROGRAMADOS POR AHORA.</p>';
			return;
		}

		eventsToShow.forEach((event, index) => {
			try {
				const eventDate = new Date(event.date).toLocaleString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
				const isPastEvent = new Date(event.date) < now;
				const isNextEvent = nextActiveEvent && event.id === nextActiveEvent.id;

				let buttonHtml = '';
				let statusBadgeHtml = '';
				let cardBorderColor = 'border-white';
				let nextEventLabelHtml = '';
				let actionClass = '';
				let dataAttribute = `data-event-id="${event.id}"`;

				if (isNextEvent) {
					nextEventLabelHtml = `<div class="absolute top-0 left-0 text-white font-pixel text-sm px-2 py-1 rounded-none border-b border-r border-black z-10 shadow-md" style="background-color: #F02D7D;">PRÓXIMO EVENTO</div>`;
				} else if (isPastEvent) {
					statusBadgeHtml = '<div class="absolute top-0 left-0 bg-red-700 text-white font-pixel text-sm px-2 py-1 rounded-none border-b border-r border-black z-10 shadow-md">FINALIZADO</div>';
				}

				if (isPastEvent) {
					if (event.galleryImages && event.galleryImages.length > 0) {
						buttonHtml = `<button data-event-id="${event.id}" class="gallery-link-btn w-full neon-btn text-white font-pixel text-2xl py-3 px-4 rounded-none">VER GALERÍA</button>`;
						actionClass = 'gallery-link-btn cursor-pointer';
					} else {
						buttonHtml = `<button disabled class="w-full bg-gray-800 text-gray-500 font-pixel text-2xl py-3 px-4 rounded-none border border-gray-700 cursor-not-allowed">EVENTO FINALIZADO</button>`;
						dataAttribute = '';
					}
				} else {
					const capacity = event.ticketCapacity || 0;
					const sold = event.ticketsSold || 0;
					if (capacity > 0 && sold >= capacity) {
						buttonHtml = `<button disabled class="w-full bg-red-800 text-red-300 font-pixel text-2xl py-3 px-4 rounded-none border border-red-700 cursor-not-allowed">AGOTADO</button>`;
						dataAttribute = '';
					} else {
						buttonHtml = `<button data-event-id="${event.id}" class="get-ticket-btn w-full neon-btn font-pixel text-2xl py-3 px-4 rounded-none">CONSEGUIR ENTRADA</button>`;
						actionClass = 'get-ticket-btn cursor-pointer';
					}
				}

				const card = document.createElement('div');
				card.className = `relative bg-gray-900 rounded-none ${cardBorderColor} overflow-hidden flex flex-col transform transition-all hover:border-gray-300 hover:shadow-white/30 duration-300 reveal-on-scroll`;

				const imageUrl = event.posterImageUrl || `https://placehold.co/400x200/000000/ffffff?text=${encodeURIComponent(event.name || 'Evento')}&font=vt323`;
				const price = (event.price || 0).toFixed(2);

				// Priority Loading: Primer evento Eager (el más importante), resto Lazy
				const loadingAttr = index === 0 ? 'eager' : 'lazy';

				card.innerHTML = `
						${nextEventLabelHtml || statusBadgeHtml}
						<div class="w-full bg-black border-b ${cardBorderColor} overflow-hidden ${actionClass}" ${dataAttribute}>
							<img src="${imageUrl}" alt="${event.name || 'Evento'}" loading="${loadingAttr}" class="w-full ${isPastEvent ? 'opacity-60' : ''}" onerror="this.onerror=null;this.src='https://placehold.co/400x200/000/fff?text=Error&font=vt323';">
						</div>
						<div class="p-6 flex flex-col flex-grow">
							<h3 class="text-3xl font-pixel ${isPastEvent ? 'text-gray-500' : 'text-white text-glow-white'} mb-2 ${actionClass} glitch-hover" ${dataAttribute}>
							   ${event.name || 'Evento sin nombre'}
							</h3>
							<p class="text-gray-400 font-semibold font-pixel text-lg mb-3">${eventDate || 'Fecha no disponible'}</p>
							
							${!isPastEvent ? `<div class="event-countdown font-pixel text-neon-pink text-lg mb-3" data-date="${event.date}"></div>` : ''}
							
							<p class="text-4xl font-extrabold ${isPastEvent ? 'text-gray-600' : 'text-white'} mb-4">${price} €</p>
							<p class="text-gray-400 mb-6 flex-grow" style="white-space: pre-wrap;">${event.description || 'Sin descripción.'}</p>				
							${buttonHtml}
						</div>
					`;
				homeEventListContainer.appendChild(card);
			} catch (e) {
				console.error(`Error renderizando evento ${event?.id} en home:`, e);
			}
		});

		// --- LOGIC: Fallback Gallery Card ---
		// If NO active/next event exists AND there is a past event with a gallery
		if (!nextActiveEvent && mostRecentPastEvent && mostRecentPastEvent.galleryImages && mostRecentPastEvent.galleryImages.length > 0) {
			try {
				const galleryCard = document.createElement('div');
				galleryCard.className = `relative bg-gray-900 rounded-none border border-white overflow-hidden flex flex-col transform transition-all hover:border-gray-300 hover:shadow-white/30 duration-300 reveal-on-scroll mt-8`;

				const galleryCover = mostRecentPastEvent.galleryImages[0];
				const photoCount = mostRecentPastEvent.galleryImages.length;

				galleryCard.innerHTML = `
					<div class="absolute top-0 left-0 bg-blue-700 text-white font-pixel text-sm px-2 py-1 rounded-none border-b border-r border-black z-10 shadow-md">GALERÍA DISPONIBLE</div>
					<div class="w-full bg-black border-b border-white overflow-hidden gallery-link-btn cursor-pointer" data-event-id="${mostRecentPastEvent.id}">
						<img src="${galleryCover}" alt="Galería ${mostRecentPastEvent.name}" loading="lazy" class="w-full opacity-90 transition-opacity hover:opacity-100">
					</div>
					<div class="p-6 flex flex-col flex-grow">
						<h3 class="text-3xl font-pixel text-white text-glow-white mb-2 gallery-link-btn cursor-pointer" data-event-id="${mostRecentPastEvent.id}">
							FOTOS: ${mostRecentPastEvent.name}
						</h3>
						<p class="text-gray-400 font-pixel text-lg mb-4">Revive la fiesta con ${photoCount} fotos increíbles.</p>
						<button data-event-id="${mostRecentPastEvent.id}" class="gallery-link-btn w-full neon-btn text-white font-pixel text-2xl py-3 px-4 rounded-none">
							VER ${photoCount} FOTOS
						</button>
					</div>
				`;
				homeEventListContainer.appendChild(galleryCard);
			} catch (e) {
				console.error("Error renderizando tarjeta extra de galería:", e);
			}
		}

		// Re-adjuntar listeners
		homeEventListContainer.querySelectorAll('.get-ticket-btn').forEach(btn => addTrackedListener(btn, 'click', handleGetTicket));
		homeEventListContainer.querySelectorAll('.gallery-link-btn').forEach(btn => addTrackedListener(btn, 'click', handleGalleryLink));

		// Iniciar observación para animaciones
		observeRevealElements();
		if (typeof startEventCountdowns === 'function') startEventCountdowns();
	}


	/**
	 * Renderiza todos los eventos públicos no archivados en la página de eventos.
	 * MODIFICADO: Imagen completa, imagen y título clicables.
	 */
	function renderPublicEvents(events) {
		clearDynamicListListeners('publicEvents');
		if (!eventListContainer) return;
		eventListContainer.innerHTML = '';

		if (!Array.isArray(events)) {
			eventListContainer.innerHTML = '<p class="text-red-400 text-center col-span-full font-pixel">Error al cargar eventos.</p>';
			return;
		}

		const now = new Date();
		const eventsToShow = events
			.filter(e => e && !e.isArchived) // Filtrar nulos y archivados
			.sort((a, b) => (b.date && a.date) ? new Date(b.date) - new Date(a.date) : 0); // Más recientes primero

		if (eventsToShow.length === 0) {
			eventListContainer.innerHTML = '<p class="text-gray-400 text-center col-span-full font-pixel">NO HAY EVENTOS PROGRAMADOS POR AHORA.</p>';
			return;
		}

		eventsToShow.forEach(event => {
			try {
				const eventDate = event.date ? new Date(event.date).toLocaleString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha no disponible';
				const isPastEvent = event.date ? new Date(event.date) < now : false;

				let buttonHtml = '';
				let statusBadgeHtml = '';
				let cardBorderColor = 'border-white';
				let actionClass = ''; // Para hacer imagen/título clicables
				let dataAttribute = `data-event-id="${event.id}"`; // Para imagen/título

				if (isPastEvent) {
					statusBadgeHtml = '<div class="absolute top-0 left-0 bg-red-700 text-white font-pixel text-sm px-2 py-1 rounded-none border-b border-r border-black z-10 shadow-md">FINALIZADO</div>';
					if (event.galleryImages && event.galleryImages.length > 0) {
						buttonHtml = `<button data-event-id="${event.id}" class="gallery-link-btn w-full neon-btn text-white font-pixel text-2xl py-3 px-4 rounded-none">VER GALERÍA</button>`;
						actionClass = 'gallery-link-btn cursor-pointer'; // <-- Acción clicable
					} else {
						buttonHtml = `<button disabled class="w-full bg-gray-800 text-gray-500 font-pixel text-2xl py-3 px-4 rounded-none border border-gray-700 cursor-not-allowed">EVENTO FINALIZADO</button>`;
						dataAttribute = ''; // <-- Sin acción clicable
					}
				} else {
					const capacity = event.ticketCapacity || 0;
					const sold = event.ticketsSold || 0;
					if (capacity > 0 && sold >= capacity) {
						buttonHtml = `<button disabled class="w-full bg-red-800 text-red-300 font-pixel text-2xl py-3 px-4 rounded-none border border-red-700 cursor-not-allowed">AGOTADO</button>`;
						dataAttribute = ''; // <-- Sin acción clicable
					} else {
						buttonHtml = `<button data-event-id="${event.id}" class="get-ticket-btn w-full neon-btn font-pixel text-2xl py-3 px-4 rounded-none">CONSEGUIR ENTRADA</button>`;
						actionClass = 'get-ticket-btn cursor-pointer'; // <-- Acción clicable
					}
				}

				const card = document.createElement('div');
				card.className = `relative bg-gray-900 rounded-none ${cardBorderColor} overflow-hidden flex flex-col transform transition-all hover:border-gray-300 hover:shadow-white/30 duration-300 reveal-on-scroll`;

				const imageUrl = event.posterImageUrl || `https://placehold.co/400x200/000000/ffffff?text=${encodeURIComponent(event.name || 'Evento')}&font=vt323`;
				const price = (event.price || 0).toFixed(2);

				card.innerHTML = `
						${statusBadgeHtml}
						<!-- MODIFICADO: Sin altura fija, con actionClass y dataAttribute -->
						<div class="w-full bg-black border-b ${cardBorderColor} overflow-hidden ${actionClass}" ${dataAttribute}>
							<img src="${imageUrl}" alt="${event.name || 'Evento'}" class="w-full ${isPastEvent ? 'opacity-60' : ''}" onerror="this.onerror=null;this.src='https://placehold.co/400x200/000/fff?text=Error&font=vt323';">
						</div>
						<div class="p-6 flex flex-col flex-grow">
							 <!-- MODIFICADO: con actionClass y dataAttribute -->
							 <h3 class="text-3xl font-pixel ${isPastEvent ? 'text-gray-500' : 'text-white text-glow-white'} mb-2 ${actionClass} glitch-hover" ${dataAttribute}>
								${event.name || 'Evento sin nombre'}
							 </h3>
							 <p class="text-gray-400 font-semibold font-pixel text-lg mb-3">${eventDate}</p>
							 
							 <!-- CUENTA ATRÁS -->
							 ${!isPastEvent ? `<div class="event-countdown font-pixel text-neon-pink text-lg mb-3" data-date="${event.date}"></div>` : ''}
							 
							 <p class="text-4xl font-extrabold ${isPastEvent ? 'text-gray-600' : 'text-white'} mb-4">${price} €</p>
							 <p class="text-gray-400 mb-6 flex-grow" style="white-space: pre-wrap;">${event.description || 'Sin descripción.'}</p>
							${buttonHtml}
						</div>
					`;
				eventListContainer.appendChild(card);
			} catch (e) {
				console.error(`Error renderizando evento ${event?.id} en lista pública:`, e);
			}
		});

		// Re-adjuntar listeners (ya incluye los nuevos elementos clicables)
		eventListContainer.querySelectorAll('.get-ticket-btn').forEach(btn => addTrackedListener(btn, 'click', handleGetTicket));
		eventListContainer.querySelectorAll('.gallery-link-btn').forEach(btn => addTrackedListener(btn, 'click', handleGalleryLink));

		// Iniciar observación para animaciones
		observeRevealElements();
		if (typeof startEventCountdowns === 'function') startEventCountdowns();
	}

	function handleGalleryLink(e) {
		const eventId = parseInt(e.currentTarget.dataset.eventId, 10);
		if (isNaN(eventId)) return;
		renderGalleryImages(eventId); // Muestra las imágenes del evento
		showPage('gallery'); // Cambia a la página de galería
	}

	/**
	 * Renderiza el banner de la home (imagen, vídeo o embed).
	 */
	function renderBannerVideo() {
		if (!homeBannerContainer || !appState) return;
		homeBannerContainer.innerHTML = ''; // Limpiar anterior

		const url = appState.bannerVideoUrl || ""; // Obtener del estado cargado
		console.log("Rendering Banner with URL:", url);

		if (!url) {
			homeBannerContainer.innerHTML = '<div class="absolute inset-0 flex items-center justify-center bg-black text-gray-500 font-pixel">Banner no configurado</div>';
			return;
		}

		// Determinar tipo de URL (lógica sin cambios)
		const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || url.startsWith('uploads/') || url.startsWith('data:image');
		const isVideoUrl = /\.(mp4|webm|ogv)$/i.test(url) || (url.startsWith('uploads/') && !isImageUrl) || url.startsWith('data:video'); // Asumir video si es upload y no imagen
		const isEmbedUrl = url.includes('/embed/') || url.includes('youtube.com/watch') || url.includes('youtu.be') || url.includes('vimeo.com');

		let element;
		let fallbackDiv;
		const setupFallback = (elementType) => {
			fallbackDiv = document.createElement('div');
			fallbackDiv.className = "absolute inset-0 flex items-center justify-center bg-black text-gray-500 font-pixel text-lg";
			fallbackDiv.textContent = `Cargando ${elementType}...`;
			homeBannerContainer.appendChild(fallbackDiv);
			let loadTimeout;

			const showFallbackMessage = (message) => {
				if (fallbackDiv) {
					fallbackDiv.textContent = message;
					fallbackDiv.style.display = 'flex'; // Asegurar visibilidad
				}
				clearTimeout(loadTimeout);
			};
			const hideFallbackMessage = () => {
				if (fallbackDiv) fallbackDiv.style.display = 'none';
				clearTimeout(loadTimeout);
			};

			// Timeout de carga
			loadTimeout = setTimeout(() => {
				if (fallbackDiv && fallbackDiv.style.display !== 'none') {
					showFallbackMessage(`Error: Timeout al cargar ${elementType}.`);
				}
			}, 10000); // 10 segundos timeout

			return { showFallbackMessage, hideFallbackMessage };
		};

		try {
			if (isImageUrl) {
				const { showFallbackMessage, hideFallbackMessage } = setupFallback('imagen');
				element = document.createElement('img');
				element.src = url;
				element.alt = "Banner Principal";
				element.className = "absolute top-0 left-0 w-full h-full object-cover border-0";
				element.onload = hideFallbackMessage;
				element.onerror = () => showFallbackMessage('Error al cargar imagen.');
			} else if (isVideoUrl) {
				const { showFallbackMessage, hideFallbackMessage } = setupFallback('vídeo');
				element = document.createElement('video');
				element.src = url;
				element.className = "absolute top-0 left-0 w-full h-full object-cover border-0";
				element.autoplay = true; element.loop = true; element.muted = true; element.playsInline = true; // Attributos estándar
				element.onloadeddata = hideFallbackMessage; // Evento más fiable para vídeo
				element.onerror = (e) => {
					console.error('Video Error:', e, 'Source:', element.src.substring(0, 50) + '...');
					let errorMsg = 'Error al cargar vídeo';
					if (element.error) {
						switch (element.error.code) {
							case MediaError.MEDIA_ERR_ABORTED: errorMsg += ' (Abortado)'; break;
							case MediaError.MEDIA_ERR_NETWORK: errorMsg += ' (Error de red)'; break;
							case MediaError.MEDIA_ERR_DECODE: errorMsg += ' (Error de decodificación)'; break;
							case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg += ' (Formato no soportado)'; break;
							default: errorMsg += ` (Código ${element.error.code})`; break;
						}
					}
					showFallbackMessage(errorMsg);
				};
			} else if (isEmbedUrl) {
				// Simplificar para embeds, asumimos que funcionan o el iframe muestra su propio error
				element = document.createElement('iframe');
				// Extraer ID de YouTube para usar URL de embed sin cookies
				let embedUrl = url;
				if (url.includes('youtube.com/watch')) {
					const videoId = new URL(url).searchParams.get('v');
					if (videoId) embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`;
				} else if (url.includes('youtu.be/')) {
					const videoId = new URL(url).pathname.substring(1);
					if (videoId) embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`;
				}
				element.src = embedUrl;
				element.className = "absolute top-0 left-0 w-full h-full border-0";
				element.setAttribute('frameborder', '0');
				element.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
				element.setAttribute('allowfullscreen', '');
				// No usamos fallback complejo para iframes
			} else {
				homeBannerContainer.innerHTML = `<div class="absolute inset-0 flex items-center justify-center bg-black text-yellow-500 font-pixel">Tipo de URL no soportado: ${url.substring(0, 30)}...</div>`;
				return;
			}

			if (element) {
				homeBannerContainer.appendChild(element);
			}
		} catch (e) {
			console.error("Error creando elemento de banner:", e);
			homeBannerContainer.innerHTML = '<div class="absolute inset-0 flex items-center justify-center bg-black text-red-500 font-pixel">Error al mostrar banner</div>';
		}
	}

	/**
	 * Renderiza la lista de eventos con galerías en la página de Galería.
	 * MODIFICADO: Imagen completa.
	 */
	function renderGalleryEventList() {
		clearDynamicListListeners('galleryList');
		if (!galleryEventListContainer) return;
		galleryEventListContainer.innerHTML = '';

		// Ocultar vista de imágenes si está visible
		if (galleryImageViewContainer) galleryImageViewContainer.classList.add('hidden');
		galleryEventListContainer.classList.remove('hidden'); // Mostrar lista

		if (!appState || !Array.isArray(appState.events)) {
			galleryEventListContainer.innerHTML = '<p class="text-red-400 text-center col-span-full font-pixel">Error al cargar galerías.</p>';
			return;
		}

		const eventsWithGalleries = appState.events
			.filter(e => e && e.galleryImages && e.galleryImages.length > 0) // Filtrar nulos y sin galería
			.sort((a, b) => (b.date && a.date) ? new Date(b.date) - new Date(a.date) : 0); // Más recientes primero

		if (eventsWithGalleries.length === 0) {
			galleryEventListContainer.innerHTML = '<p class="text-gray-400 text-center col-span-full font-pixel">NO HAY GALERÍAS DISPONIBLES.</p>';
			return;
		}

		eventsWithGalleries.forEach(event => {
			try {
				const card = document.createElement('button');
				card.className = "gallery-event-btn w-full bg-gray-900 rounded-none border border-white overflow-hidden flex flex-col text-left transform transition-all hover:border-gray-300 hover:shadow-white/30 duration-300";
				card.dataset.eventId = event.id;

				// Usa la primera imagen como portada, con fallback
				const coverImage = event.galleryImages[0] || `https://placehold.co/600x400/000/fff?text=${encodeURIComponent(event.name || 'Galería')}&font=vt323`;
				const photoCount = event.galleryImages.length;

				card.innerHTML = `
						<!-- MODIFICADO: Sin altura fija, sin object-contain -->
						<div class="w-full bg-black border-b border-white overflow-hidden">
							<img src="${coverImage}" alt="${event.name || 'Evento'}" class="w-full" onerror="this.onerror=null;this.src='https://placehold.co/600x400/000/fff?text=Error&font=vt323';">
						</div>
						<div class="p-6">
							<h3 class="text-3xl font-pixel text-white text-glow-white truncate glitch-hover">${event.name || 'Evento sin nombre'}</h3>
							 <p class="text-gray-400 font-pixel text-lg mt-1">${photoCount} FOTO${photoCount !== 1 ? 'S' : ''}</p>
						</div>`;

				// Añadir clase de animación
				card.classList.add('reveal-on-scroll');

				galleryEventListContainer.appendChild(card);
			} catch (e) {
				console.error(`Error renderizando galería para evento ${event?.id}:`, e);
			}
		});

		// Re-adjuntar listeners
		galleryEventListContainer.querySelectorAll('.gallery-event-btn').forEach(btn => addTrackedListener(btn, 'click', (e) => renderGalleryImages(parseInt(e.currentTarget.dataset.eventId, 10))));

		// Iniciar animación
		observeRevealElements();
	}

	/**
	 * Renderiza las galerías de eventos pasados en la página de inicio.
	 * MODIFICADO: Imagen completa.
	 */
	function renderPastGalleries(events) {
		if (!pastGalleriesGrid) return;
		clearDynamicListListeners('pastGalleryList');
		pastGalleriesGrid.innerHTML = '';

		if (!Array.isArray(events)) {
			pastGalleriesGrid.innerHTML = '<p class="text-red-400 text-center col-span-full font-pixel">Error al cargar galerías pasadas.</p>';
			return;
		}

		const now = new Date();
		const pastEventsWithGalleries = events
			.filter(e => e && e.date && new Date(e.date) < now && e.galleryImages && e.galleryImages.length > 0) // Robustez
			.sort((a, b) => new Date(b.date) - new Date(a.date)); // Más recientes primero

		if (pastEventsWithGalleries.length === 0) {
			pastGalleriesGrid.innerHTML = '<p class="text-gray-400 text-center col-span-full font-pixel">AÚN NO HAY GALERÍAS DE EVENTOS PASADOS.</p>';
			return;
		}

		pastEventsWithGalleries.forEach(event => {
			try {
				const card = document.createElement('button');
				card.className = "past-gallery-event-btn w-full bg-gray-900 rounded-none border border-white overflow-hidden flex flex-col text-left transform transition-all hover:border-gray-300 hover:shadow-white/30 duration-300";
				card.dataset.eventId = event.id;

				const coverImage = event.galleryImages[0] || `https://placehold.co/600x400/000/fff?text=${encodeURIComponent(event.name || 'Galería')}&font=vt323`;
				const eventDateStr = new Date(event.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
				const photoCount = event.galleryImages.length;

				card.innerHTML = `
						<!-- MODIFICADO: Sin altura fija, sin object-contain -->
						<div class="w-full bg-black border-b border-white overflow-hidden">
							<img src="${coverImage}" alt="${event.name || 'Evento'}" class="w-full" onerror="this.onerror=null;this.src='https://placehold.co/600x400/000/fff?text=Error&font=vt323';">
						</div>
						<div class="p-6">
							<h3 class="text-3xl font-pixel text-white text-glow-white truncate glitch-hover">${event.name || 'Evento sin nombre'}</h3>
							<p class="text-sm text-gray-500 font-pixel">${eventDateStr || 'Fecha desconocida'}</p>
							<p class="text-gray-400 font-pixel text-lg mt-1">${photoCount} FOTO${photoCount !== 1 ? 'S' : ''}</p>
						</div>`;

				// Añadir clase de animación
				card.classList.add('reveal-on-scroll');

				pastGalleriesGrid.appendChild(card);
			} catch (e) {
				console.error(`Error renderizando galería pasada ${event?.id}:`, e);
			}
		});

		// Re-adjuntar listeners
		pastGalleriesGrid.querySelectorAll('.past-gallery-event-btn').forEach(btn => {
			addTrackedListener(btn, 'click', (e) => {
				const eventId = parseInt(e.currentTarget.dataset.eventId, 10);
				if (!isNaN(eventId)) {
					renderGalleryImages(eventId);
					showPage('gallery');
				}
			});
		});

		// Iniciar animación
		observeRevealElements();
	}

	/**
	 * Renderiza las imágenes de una galería específica.
	 */
	function renderGalleryImages(eventId) {
		clearDynamicListListeners('eventGalleryImages');

		if (!galleryEventListContainer || !galleryImageViewContainer || !galleryImageViewTitle || !galleryImageViewGrid || !appState || !appState.events) return;

		const event = appState.events.find(e => e.id === eventId);
		if (!event) {
			// Mostrar error o volver a la lista
			console.error(`Evento ${eventId} no encontrado para mostrar galería.`);
			renderGalleryEventList(); // Volver a la lista
			return;
		}

		galleryEventListContainer.classList.add('hidden');
		galleryImageViewContainer.classList.remove('hidden');
		galleryImageViewTitle.textContent = event.name || 'Galería';
		galleryImageViewGrid.innerHTML = ''; // Limpiar grid

		const galleryUrls = event.galleryImages || [];

		if (galleryUrls.length === 0) {
			galleryImageViewGrid.innerHTML = '<p class="text-gray-400 text-center col-span-full font-pixel">NO HAY FOTOS EN ESTA GALERÍA.</p>';
			return;
		}

		galleryUrls.forEach((url, index) => {
			if (!url) return; // Saltar URLs vacías/inválidas
			const imgWrapper = document.createElement('button');
			imgWrapper.className = "event-gallery-img-btn rounded-none overflow-hidden border border-gray-700 transform transition-all hover:border-gray-300 duration-300 aspect-square"; // Forzar cuadrado

			imgWrapper.innerHTML = `<img src="${url}" alt="Foto de ${event.name || 'evento'}" loading="lazy" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/300x300/000/fff?text=Error&font=vt323';">`;
			galleryImageViewGrid.appendChild(imgWrapper);

			addTrackedListener(imgWrapper, 'click', () => showImageModal(url, galleryUrls, index));
		});
	}


	// --- Funciones para DRAGS (Público) ---

	/**
	 * Renderiza la lista de Drags en la página pública.
	 * MODIFICADO: Imagen completa.
	 */
	function renderDragList() {
		clearDynamicListListeners('dragList');
		if (!dragListContainer) return;
		dragListContainer.innerHTML = '';

		// Ocultar vista de galería de drag si estaba visible
		if (dragGalleryViewContainer) dragGalleryViewContainer.classList.add('hidden');
		dragListContainer.classList.remove('hidden'); // Mostrar lista

		const dragsToShow = appState.drags || [];

		if (dragsToShow.length === 0) {
			dragListContainer.innerHTML = '<p class="text-gray-400 text-center col-span-full font-pixel">NO HAY DRAGS REGISTRADAS POR AHORA.</p>';
			return;
		}


		// --- NUEVO: Referencia a la Barra de Navegación ---
		const dragsNavBar = document.getElementById('drags-nav-bar');
		if (dragsNavBar) dragsNavBar.innerHTML = ''; // Limpiar barra anterior

		// --- MODIFICADO: Aleatoriedad ---
		// Barajamos el array para que el orden sea distinto cada vez
		const randomDrags = shuffleArray(dragsToShow);

		randomDrags.forEach(drag => {
			try {
				const card = document.createElement('div');
				const cardColor = drag.cardColor && /^#[0-9A-F]{6}$/i.test(drag.cardColor) ? drag.cardColor : '#FFFFFF'; // Validar color
				card.className = `bg-gray-900 rounded-none border overflow-hidden flex flex-col transform transition-all hover:border-gray-300 hover:shadow-white/30 duration-300`;
				card.style.borderColor = cardColor;

				// ID ÚNICO PARA SCROLL
				const cardId = `drag-card-${drag.id}`;
				card.id = cardId;

				// --- NUEVO: Crear Chip de Navegación ---
				if (dragsNavBar) {
					const navChip = document.createElement('button');
					navChip.textContent = drag.name || 'Drag';
					navChip.className = "font-pixel text-sm px-3 py-1 bg-transparent border-2 text-white transition-all duration-300 hover:text-black hover:scale-105";
					navChip.style.borderColor = cardColor;

					// Efecto Hover: Rellenar con color de la drag
					navChip.addEventListener('mouseenter', () => {
						navChip.style.backgroundColor = cardColor;
						// Ajuste de contraste simple: si es muy oscuro, texto blanco, si no negro. (Aproximación simple: asumimos negro para colores vibrantes de drag)
						navChip.style.color = '#000';
					});
					navChip.addEventListener('mouseleave', () => {
						navChip.style.backgroundColor = 'transparent';
						navChip.style.color = '#fff';
					});

					// Scroll al hacer click
					navChip.onclick = () => {
						const targetCard = document.getElementById(cardId);
						if (targetCard) {
							targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
							// Efecto visual de "focus" temporal
							targetCard.classList.add('ring-2', 'ring-white');
							setTimeout(() => targetCard.classList.remove('ring-2', 'ring-white'), 1500);
						}
					};
					dragsNavBar.appendChild(navChip);
				}

				const imageUrl = drag.coverImageUrl || `https://placehold.co/400x400/000/fff?text=${encodeURIComponent(drag.name || 'Drag')}&font=vt323`;
				const galleryCount = drag.galleryImages?.length || 0;
				const merchItems = drag.merchItems || [];
				const merchCount = merchItems.length;

				// --- NUEVO: Construcción del Carousel de Merch ---
				let merchCarouselHtml = '';
				if (merchCount > 0) {
					let itemsHtml = '';
					merchItems.forEach(item => {
						const itemImage = item.imageUrl || `https://placehold.co/200x200/000/fff?text=${encodeURIComponent(item.name || 'Item')}&font=vt323`;
						const price = (parseFloat(item.price) || 0).toFixed(2);
						itemsHtml += `
							<div class="flex-shrink-0 w-36 bg-black border border-gray-700 p-2 snap-center flex flex-col">
								<div class="h-24 w-full bg-gray-900 mb-2 overflow-hidden flex items-center justify-center">
									<img src="${itemImage}" alt="${item.name}" class="object-cover w-full h-full" onerror="this.src='https://placehold.co/200x200/000/fff?text=Error&font=vt323'">
								</div>
								<p class="text-white text-xs font-pixel truncate mb-1" title="${item.name}">${item.name}</p>
								<p class="text-pink-500 font-bold text-sm mb-2">${price}€</p>
								<button 
									data-item-id="${item.id}" 
									data-drag-id="${drag.id}"
									class="auto-buy-merch-btn w-full bg-white text-black text-xs font-pixel py-1 hover:bg-pink-500 hover:text-white transition-colors mt-auto rounded-none border border-gray-400">
									COMPRAR
								</button>
							</div>`;
					});

					merchCarouselHtml = `
						<div class="mt-4 mb-2">
							<h4 class="text-sm font-pixel text-pink-400 mb-2 border-b border-gray-800 pb-1">TIENDA OFICIAL:</h4>
							<div class="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
								${itemsHtml}
							</div>
						</div>`;
				}
				// --- FIN NUEVO ---

				const instagramBtnHtml = drag.instagramHandle
					? `<a href="https://www.instagram.com/${drag.instagramHandle}" target="_blank" rel="noopener noreferrer" class="drag-instagram-btn w-full bg-gray-700 text-white font-pixel text-lg py-2 px-4 rounded-none border border-gray-600 hover:bg-gray-600 transition-colors duration-300 flex items-center justify-center gap-2">
							   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
							   @${drag.instagramHandle}
						   </a>`
					: '';

				card.innerHTML = `
						<!-- MODIFICADO: Sin altura fija, sin object-contain -->
						<div class="w-full bg-black border-b overflow-hidden" style="border-color: ${cardColor};">
							<img src="${imageUrl}" alt="${drag.name || 'Drag'}" class="w-full" onerror="this.onerror=null;this.src='https://placehold.co/400x400/000/fff?text=Error&font=vt323';">
						</div>
						<div class="p-6 flex flex-col flex-grow">
							<h3 class="text-3xl font-pixel text-white text-glow-white mb-2 truncate glitch-hover">${drag.name || 'Drag sin nombre'}</h3>
							<p class="text-gray-400 mb-6 flex-grow">${drag.description || 'Sin descripción.'}</p>
							
							<div class="space-y-3">
								<button data-drag-id="${drag.id}" class="drag-gallery-btn w-full neon-btn text-white font-pixel text-lg py-2 px-4 rounded-none ${galleryCount === 0 ? 'hidden' : ''}">
									VER GALERÍA (${galleryCount})
								</button>
								 <button disabled class="w-full bg-gray-800 text-gray-500 font-pixel text-lg py-2 px-4 rounded-none border border-gray-700 cursor-not-allowed ${galleryCount > 0 ? 'hidden' : ''}">
									GALERÍA (0)
								</button>
								
								<!-- Inserto Carrusel Merch -->
								${merchCarouselHtml}
								
								${instagramBtnHtml}
							</div>
						</div>
					`;

				// Añadir clase de animación
				card.classList.add('reveal-on-scroll');

				dragListContainer.appendChild(card);
			} catch (e) {
				console.error(`Error renderizando drag ${drag?.id}:`, e);
			}
		});

		// Re-adjuntar listeners
		dragListContainer.querySelectorAll('.drag-gallery-btn').forEach(btn => addTrackedListener(btn, 'click', (e) => renderDragGalleryImages(parseInt(e.currentTarget.dataset.dragId, 10))));
		dragListContainer.querySelectorAll('.auto-buy-merch-btn').forEach(btn => addTrackedListener(btn, 'click', handleMerchBuyClick));

		// Iniciar animación
		observeRevealElements();
	}

	/**
	 * Renderiza las imágenes de la galería de una drag específica.
	 */
	function renderDragGalleryImages(dragId) {
		clearDynamicListListeners('dragGalleryImages');

		if (!dragListContainer || !dragGalleryViewContainer || !dragGalleryViewTitle || !dragGalleryViewGrid || !appState || !appState.drags) return;

		const drag = appState.drags.find(d => d.id === dragId);
		if (!drag) {
			console.error(`Drag ${dragId} no encontrada para mostrar galería.`);
			renderDragList(); // Volver a la lista
			return;
		}

		dragListContainer.classList.add('hidden');
		dragGalleryViewContainer.classList.remove('hidden');
		dragGalleryViewTitle.textContent = drag.name || 'Galería Drag';
		dragGalleryViewGrid.innerHTML = ''; // Limpiar

		const galleryUrls = drag.galleryImages || [];

		if (galleryUrls.length === 0) {
			dragGalleryViewGrid.innerHTML = '<p class="text-gray-400 text-center col-span-full font-pixel">NO HAY FOTOS EN ESTA GALERÍA.</p>';
			return;
		}

		galleryUrls.forEach((url, index) => {
			if (!url) return;
			const imgWrapper = document.createElement('button');
			imgWrapper.className = "drag-gallery-img-btn rounded-none overflow-hidden border border-gray-700 transform transition-all hover:border-gray-300 duration-300 aspect-square"; // Forzar cuadrado

			imgWrapper.innerHTML = `<img src="${url}" alt="Foto de ${drag.name || 'drag'}" loading="lazy" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/300x300/000/fff?text=Error&font=vt323';">`;
			dragGalleryViewGrid.appendChild(imgWrapper);

			addTrackedListener(imgWrapper, 'click', () => showImageModal(url, galleryUrls, index));
		});
	}

	// --- FUNCIONALIDAD DE MERCH PÚBLICO ---

	/**
	 * Renderiza la página principal de Merchandising (Web + Drags).
	 */
	function renderMerchPage() {
		console.log("=== renderMerchPage called ===");
		const webMerchListContainer = document.getElementById('public-web-merch-list-container');
		const dragsMerchListContainer = document.getElementById('drags-merch-list-container');

		if (!webMerchListContainer || !dragsMerchListContainer) {
			console.error("Merch containers not found!");
			return;
		}

		// 1. Renderizar Web Merch
		webMerchListContainer.innerHTML = '';
		const webItems = appState.webMerch || [];
		console.log("Web Merch items:", webItems.length);

		if (webItems.length === 0) {
			webMerchListContainer.innerHTML = '<p class="text-gray-400 text-center col-span-full font-pixel">Próximamente merch oficial...</p>';
		} else {
			webItems.forEach(item => {
				const card = createMerchCard(item, { id: 'web', name: 'Rodetes Web' });
				webMerchListContainer.appendChild(card);
			});
		}

		// 2. Renderizar Drags Merch (Lista de drags que tienen merch)
		dragsMerchListContainer.innerHTML = '';
		console.log("Total drags in appState:", (appState.drags || []).length);
		const dragsWithMerch = (appState.drags || []).filter(d => d.merchItems && d.merchItems.length > 0);
		console.log("Drags with merchItems:", dragsWithMerch.length);
		dragsWithMerch.forEach(d => console.log(`  - ${d.name}: ${d.merchItems.length} items`));

		if (dragsWithMerch.length === 0) {
			dragsMerchListContainer.innerHTML = '<p class="text-gray-400 text-center col-span-full font-pixel">Ninguna drag tiene merch disponible aún.</p>';
		} else {
			dragsWithMerch.forEach(drag => {
				const card = document.createElement('div');
				const cardColor = drag.cardColor && /^#[0-9A-F]{6}$/i.test(drag.cardColor) ? drag.cardColor : '#FFFFFF';
				card.className = `bg-gray-900 rounded-none border overflow-hidden flex flex-col transform transition-all hover:border-gray-300 hover:shadow-white/30 duration-300`;
				card.style.borderColor = cardColor;

				const imageUrl = drag.coverImageUrl || `https://placehold.co/400x400/000/fff?text=${encodeURIComponent(drag.name || 'Drag')}&font=vt323`;
				const merchItems = drag.merchItems || [];

				// Construcción del Carousel de Merch (Reutilizado)
				let merchCarouselHtml = '';
				if (merchItems.length > 0) {
					let itemsHtml = '';
					merchItems.forEach(item => {
						const itemImage = item.imageUrl || `https://placehold.co/200x200/000/fff?text=${encodeURIComponent(item.name || 'Item')}&font=vt323`;
						const price = (parseFloat(item.price) || 0).toFixed(2);
						itemsHtml += `
							<div class="flex-shrink-0 w-36 snap-center flex flex-col mb-2">
								<!-- 1. Imagen (Limpia) -->
								<div class="h-32 w-full bg-black overflow-hidden flex items-center justify-center">
									<img src="${itemImage}" alt="${item.name}" class="object-cover w-full h-full" onerror="this.src='https://placehold.co/200x200/000/fff?text=Error&font=vt323'">
								</div>
								
								<!-- 2. Info (Caja Pegada) -->
								<div class="bg-black/60 border-x border-b border-white/10 p-2">
									<p class="text-white text-xs font-pixel truncate mb-1" title="${item.name}">${item.name}</p>
									<p class="text-pink-500 font-bold text-sm">${price}€</p>
								</div>
								
								<!-- 3. Botón (Caja Pegada) -->
								<div class="mt-0">
									<button 
										data-item-id="${item.id}" 
										data-drag-id="${drag.id}"
										class="auto-buy-merch-btn w-full bg-white text-black text-xs font-pixel py-2 hover:bg-pink-500 hover:text-white transition-colors">
										COMPRAR
									</button>
								</div>
							</div>`;
					});

					merchCarouselHtml = `
						<div class="mt-4 mb-2">
							<h4 class="text-sm font-pixel text-pink-400 mb-2 border-b border-gray-800 pb-1">TIENDA OFICIAL:</h4>
							<div class="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
								${itemsHtml}
							</div>
						</div>`;
				}

				card.innerHTML = `
					<div class="w-full bg-black border-b overflow-hidden" style="border-color: ${cardColor};">
						<img src="${imageUrl}" alt="${drag.name || 'Drag'}" class="w-full" onerror="this.onerror=null;this.src='https://placehold.co/400x400/000/fff?text=Error&font=vt323';">
					</div>
					<div class="p-6 flex flex-col flex-grow">
						<h3 class="text-3xl font-pixel text-white text-glow-white mb-2 truncate glitch-hover">${drag.name || 'Drag'}</h3>
						<div class="space-y-3 mt-auto">
							<!-- Carrusel Merch -->
							${merchCarouselHtml}
						</div>
					</div>
				`;

				dragsMerchListContainer.appendChild(card);

				// Listeners del carrusel
				card.querySelectorAll('.auto-buy-merch-btn').forEach(btn => addTrackedListener(btn, 'click', handleMerchBuyClick));
			});
		}

		observeRevealElements();
		console.log("=== renderMerchPage complete ===");
	}

	/**
	 * Crea un elemento tarjeta para un artículo de merch.
	 */
	function createMerchCard(item, dragInfo) {
		const card = document.createElement('div');
		card.className = "flex flex-col transform transition-all duration-300 hover:scale-[1.02] mb-6";

		const imageUrl = item.imageUrl || `https://placehold.co/300x300/333/ccc?text=${encodeURIComponent(item.name || 'Merch')}&font=vt323`;
		const price = (item.price || 0).toFixed(2);

		card.innerHTML = `
			<!-- 1. Imagen (Limpia) -->
			<div class="w-full aspect-square bg-black overflow-hidden flex items-center justify-center">
				<img src="${imageUrl}" alt="${item.name || 'Artículo'}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/300x300/333/ccc?text=Error&font=vt323';">
			</div>
			
			<!-- 2. Info (Caja Pegada) -->
			<div class="bg-black/60 backdrop-blur-md border-x border-b border-white/10 p-4">
				<h4 class="text-xl font-pixel text-white mb-1 truncate">${item.name || 'Artículo'}</h4>
				<p class="text-xs text-gray-500 mb-2 font-pixel tracking-wider">${dragInfo.name}</p>
				<p class="text-2xl font-bold text-pink-500">${price} €</p>
			</div>
			
			<!-- 3. Botón (Caja Pegada Full Width) -->
			<div class="mt-0">
				<button data-item-id="${item.id}" data-drag-id="${dragInfo.id}" 
					class="w-full bg-white text-black font-pixel text-lg py-3 px-4 hover:bg-pink-500 hover:text-white transition-all merch-buy-btn shadow-lg">
					COMPRAR
				</button>
			</div>
		`;

		// Listener para comprar
		const buyBtn = card.querySelector('.merch-buy-btn');
		addTrackedListener(buyBtn, 'click', handleMerchBuyClick);

		return card;
	}


	/**
	 * Muestra el modal con la galería de merchandising de una drag.
	 */
	function handleShowMerch(e) {
		clearDynamicListListeners('merchGalleryItems');
		const dragId = parseInt(e.currentTarget.dataset.dragId, 10);
		if (isNaN(dragId) || !appState || !appState.drags) return;

		const drag = appState.drags.find(d => d.id === dragId);
		if (!drag || !merchGalleryModal || !merchGalleryTitle || !merchGalleryContent) return;

		merchGalleryTitle.textContent = `Merchandising de ${drag.name || 'Drag'}`;
		merchGalleryContent.innerHTML = ''; // Limpiar

		const merchItems = drag.merchItems || [];

		if (merchItems.length === 0) {
			merchGalleryContent.innerHTML = '<p class="text-gray-400 text-center font-pixel col-span-full">Esta drag no tiene merchandising disponible.</p>';
		} else {
			merchItems.forEach(item => {
				try {
					const card = document.createElement('div');
					card.className = "bg-gray-800 border border-white rounded-none p-4 flex flex-col";

					const imageUrl = item.imageUrl || `https://placehold.co/300x300/333/ccc?text=${encodeURIComponent(item.name || 'Merch')}&font=vt323`;
					const price = (item.price || 0).toFixed(2);

					card.innerHTML = `
							<div class="w-full h-48 bg-black flex items-center justify-center mb-4 border border-gray-600 overflow-hidden">
								<img src="${imageUrl}" alt="${item.name || 'Artículo'}" class="w-full h-full object-contain" onerror="this.onerror=null;this.src='https://placehold.co/300x300/333/ccc?text=Error&font=vt323';">
							</div>
							<h4 class="text-xl font-pixel text-white mb-1 truncate">${item.name || 'Artículo sin nombre'}</h4>
							<p class="text-2xl font-bold text-white mb-4">${price} €</p>
							<button data-item-id="${item.id}" data-drag-id="${drag.id}" class="mt-auto bg-white text-black font-pixel text-lg py-2 px-4 rounded-none border border-gray-400 hover:bg-gray-300 merch-buy-btn">
								COMPRAR
							</button>
						`;
					merchGalleryContent.appendChild(card);
				} catch (e) {
					console.error(`Error renderizando item de merch ${item?.id}:`, e);
				}
			});

			// Añadir listeners a los botones de compra
			merchGalleryContent.querySelectorAll('.merch-buy-btn').forEach(btn => {
				addTrackedListener(btn, 'click', handleMerchBuyClick);
			});
		}

		merchGalleryModal.classList.remove('hidden');
	}

	/**
	 * Muestra el modal para introducir nombre, apellidos, email y cantidad al comprar merch.
	 */
	function handleMerchBuyClick(e) {
		const itemId = parseInt(e.currentTarget.dataset.itemId, 10);
		// MODIFICADO: dragId puede ser 'web' (string) o un ID (int)
		let dragId = e.currentTarget.dataset.dragId;
		// Intentar parsear a int si no es 'web', aunque 'web' dará NaN y está bien controlarlo
		if (dragId !== 'web') {
			dragId = parseInt(dragId, 10);
		}

		if (!appState) return;

		let item, drag;

		if (dragId === 'web') {
			drag = { id: 'web', name: 'Rodetes Web' };
			item = (appState.webMerch || []).find(i => i.id === itemId);
		} else {
			if (isNaN(dragId)) return;
			drag = appState.drags.find(d => d.id === dragId);
			item = drag?.merchItems?.find(i => i.id === itemId);
		}

		if (!item || !merchPurchaseModal || !merchPurchaseForm || !merchPurchaseItemName) {
			showInfoModal("Error al iniciar la compra del artículo.", true);
			return;
		}

		merchPurchaseForm.reset();
		merchPurchaseForm['merch-quantity'].value = 1; // Default a 1
		merchPurchaseItemName.textContent = item.name || 'Artículo';
		merchPurchaseForm['merch-item-id'].value = item.id;
		merchPurchaseForm['merch-drag-id'].value = drag.id;

		merchPurchaseModal.classList.remove('hidden');
	}


	/**
	 * Procesa el formulario de compra de merch (nombre, apellidos, email, cantidad) y llama a generar venta.
	 */
	async function handleMerchPurchaseSubmit(e) {
		e.preventDefault();
		if (!merchPurchaseForm || !appState || !appState.drags) return;

		// NUEVO: Obtener nombre y apellidos
		const userName = merchPurchaseForm['merch-nombre'].value.trim();
		const userSurname = merchPurchaseForm['merch-apellidos'].value.trim();
		const userEmail = merchPurchaseForm['merch-email'].value.trim().toLowerCase();
		const quantity = parseInt(merchPurchaseForm['merch-quantity'].value, 10);
		const itemId = parseInt(merchPurchaseForm['merch-item-id'].value, 10);
		// MODIFICADO: dragId puede ser 'web' o int
		let dragId = merchPurchaseForm['merch-drag-id'].value;
		if (dragId !== 'web') {
			dragId = parseInt(dragId, 10);
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex simple

		// NUEVO: Validar Nombre y Apellidos
		if (!userName || !userSurname) {
			showInfoModal("POR FAVOR, INTRODUCE TU NOMBRE Y APELLIDOS.", true); return;
		}
		if (!userEmail || !emailRegex.test(userEmail)) {
			showInfoModal("POR FAVOR, INTRODUCE UN EMAIL VÁLIDO.", true); return;
		}
		// Validar Email (Dominios permitidos desde appState)
		const allowedDomains = appState.allowedDomains || [];
		const isDomainAllowed = allowedDomains.length === 0 || allowedDomains.some(domain => userEmail.endsWith(domain));
		if (!isDomainAllowed) {
			showInfoModal("Dominio de correo no permitido.", true); return;
		}
		if (isNaN(quantity) || quantity <= 0) {
			showInfoModal("POR FAVOR, INTRODUCE UNA CANTIDAD MAYOR QUE CERO.", true); return;
		}
		if (isNaN(itemId) || (!dragId && dragId !== 0)) {
			showInfoModal("Error: Artículo o Drag no identificados.", true); return; // Error interno
		}

		let item, drag;
		if (dragId === 'web') {
			drag = { id: 'web', name: 'Rodetes Web' };
			item = (appState.webMerch || []).find(i => i.id === itemId);
		} else {
			drag = appState.drags.find(d => d.id === dragId);
			item = drag?.merchItems?.find(i => i.id === itemId);
		}

		if (!item) {
			showInfoModal("Error: Artículo no encontrado.", true); return; // Podría haber sido eliminado mientras compraba
		}

		// Éxito, cerrar modal de compra y generar la venta
		closeModal('merch-purchase-modal');
		// MODIFICADO: Pasar nombre y apellidos
		await generateMerchSale(drag, item, userName, userSurname, userEmail, quantity);
	}

	/**
	 * Genera el registro de venta de merch, lo guarda y muestra el QR.
	 * MODIFICADO: Acepta y guarda nombre y apellidos.
	 */
	async function generateMerchSale(drag, item, userName, userSurname, userEmail, quantity) {
		if (!drag || !item || !userName || !userSurname || !userEmail || !quantity) return;

		showLoading(true);
		try {
			const saleId = crypto.randomUUID(); // ID único para la venta
			const saleDate = new Date().toISOString(); // Fecha ISO
			const fullName = `${userName} ${userSurname}`; // Combinar nombre

			const newSale = {
				saleId: saleId,
				dragId: drag.id,
				dragName: drag.name || 'Drag desconocida', // Guardar nombre por si drag se borra
				itemId: item.id,
				itemName: item.name || 'Artículo desconocido', // Guardar nombre por si item se borra
				itemPrice: item.price || 0, // Guardar precio en el momento de la venta
				quantity: quantity,
				// NUEVO: Guardar nombre y apellidos
				nombre: userName,
				apellidos: userSurname,
				email: userEmail,
				// NUEVO: Guardar imagen del item para emails
				imageUrl: item.imageUrl || '',
				saleDate: saleDate,
				status: 'Pending' // Estado inicial: Pendiente de entrega/pago
			};

			// Asegurarse de que allMerchSales sea un array
			if (!Array.isArray(allMerchSales)) {
				allMerchSales = [];
			}
			allMerchSales.push(newSale);
			await saveMerchSalesState(); // Guardar en el servidor (sin esperar confirmación visual aquí)

			// MODIFICADO: Mostrar popup de confirmación en lugar de QR
			// showMerchQrModal(drag, item, newSale, fullName); 

			let message = "";
			if (drag.id === 'web') {
				message = `
					<h3 class="text-2xl font-pixel text-white mb-4">¡PEDIDO CONFIRMADO! 🚀</h3>
					<p class="text-gray-300 mb-2">Hemos enviado un email a <b>Rodetes Party</b> con tu pedido.</p>
					<p class="text-gray-300">En breve nos pondremos en contacto contigo al email facilitado (<b>${userEmail}</b>) para gestionar el pago y el envío.</p>
					<p class="text-green-400 font-bold mt-4 text-sm">También te hemos enviado un correo de confirmación.</p>
				`;
			} else {
				message = `
					<h3 class="text-2xl font-pixel text-white mb-4">¡PEDIDO CONFIRMADO! 👑</h3>
					<p class="text-gray-300 mb-2">Hemos enviado un email a <b>${drag.name}</b> con tu pedido.</p>
					<p class="text-gray-300">Se pondrá en contacto contigo pronto al email facilitado (<b>${userEmail}</b>) para el pago y la entrega.</p>
					<p class="text-green-400 font-bold mt-4 text-sm">También te hemos enviado un correo de confirmación.</p>
				`;
			}

			// Usar el modal info existente pero con HTML custom
			showInfoModal(message, false);

			// Actualizar resumen si el admin está viendo esa sección
			if (isLoggedIn && adminPages['merch'] && !adminPages['merch'].classList.contains('hidden') && currentAdminMerchDragId === drag.id) {
				renderAdminMerchSalesSummary();
			}

		} catch (error) {
			console.error("Error generating merch sale:", error);
			showInfoModal("Error al generar el pedido. Inténtalo de nuevo.", true);
		} finally {
			showLoading(false);
		}
	}

	/**
	 * Muestra el modal final con el QR del pedido de merch.
	 * MODIFICADO: Muestra nombre y apellidos. Actualiza QR text.
	 */
	function showMerchQrModal(drag, item, sale, fullName) {
		if (!drag || !item || !sale || !fullName || !merchQrModal || !merchQrCode || !downloadMerchQrBtn || !merchHolderName) {
			console.error("Faltan elementos o datos para mostrar el modal QR de Merch");
			showInfoModal("Error al mostrar el QR del pedido.", true);
			return;
		}

		try {
			// Usar el logo de las entradas (ticketLogoUrl) si existe
			if (merchQrLogoImg) {
				const logoUrl = appState.ticketLogoUrl || '';
				merchQrLogoImg.src = logoUrl;
				merchQrLogoImg.onerror = () => { merchQrLogoImg.classList.add('hidden'); }; // Ocultar si falla
				merchQrLogoImg.classList.toggle('hidden', !logoUrl);
			}

			// NUEVO: Mostrar nombre completo
			merchHolderName.textContent = fullName;
			if (merchQrDragName) merchQrDragName.textContent = `Merch de ${drag.name || 'Drag'}`;
			if (merchQrItemName) merchQrItemName.textContent = item.name || 'Artículo';
			if (merchQrQuantity) merchQrQuantity.textContent = `Cantidad: ${sale.quantity}`;

			// Limpiar QR anterior y generar nuevo
			merchQrCode.innerHTML = '';
			// MODIFICADO: Generar QR usando el SALE ID único y añadir NOMBRE
			const qrText = `MERCH_SALE_ID:${sale.saleId}\nNOMBRE:${fullName}\nDRAG:${drag.name}\nITEM:${item.name}\nQTY:${sale.quantity}\nEMAIL:${sale.email}`;

			if (typeof QRCode !== 'undefined') {
				new QRCode(merchQrCode, {
					text: qrText,
					width: 200, height: 200,
					colorDark: "#000000", colorLight: "#ffffff",
					correctLevel: QRCode.CorrectLevel.M // Nivel M es suficiente y más robusto
				});
			} else {
				merchQrCode.innerHTML = '<p class="text-red-500 font-pixel">Error: QR no cargado</p>';
			}

			// Guardar datos en el botón de descarga para el handler
			downloadMerchQrBtn.dataset.dragName = drag.name || 'drag';
			downloadMerchQrBtn.dataset.itemName = item.name || 'item';
			downloadMerchQrBtn.dataset.saleId = sale.saleId; // Guardar ID para nombre archivo
			// NUEVO: Guardar nombre para nombre archivo
			downloadMerchQrBtn.dataset.holderName = fullName.replace(/\s+/g, '_'); // Reemplazar espacios para nombre archivo

			merchQrModal.classList.remove('hidden');

		} catch (error) {
			console.error("Error displaying merch QR modal:", error);
			showInfoModal("Error al mostrar el QR del pedido.", true);
		}
	}

	/**
	 * Descarga el QR del pedido de merch como PNG.
	 * MODIFICADO: Usa nombre del comprador en el nombre de archivo.
	 */
	async function handleDownloadMerchQr() {
		if (!merchQrToDownload || typeof html2canvas === 'undefined' || !downloadMerchQrBtn) {
			showInfoModal("Error: No se pudo iniciar la descarga (faltan elementos).", true); return;
		}

		const dragName = downloadMerchQrBtn.dataset.dragName || 'drag';
		const itemName = downloadMerchQrBtn.dataset.itemName || 'item';
		const holderName = downloadMerchQrBtn.dataset.holderName || 'comprador'; // Nuevo
		const saleIdShort = (downloadMerchQrBtn.dataset.saleId || crypto.randomUUID()).substring(0, 8); // ID corto para nombre

		showLoading(true);
		try {
			// Asegurar que el fondo sea negro para el canvas
			const canvas = await html2canvas(merchQrToDownload, { scale: 2, backgroundColor: "#000000" });
			const dataUrl = canvas.toDataURL('image/png');
			const link = document.createElement('a');
			link.href = dataUrl;

			// Nombres de archivo seguros
			const safeDragName = dragName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
			const safeItemName = itemName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
			const safeHolderName = holderName.replace(/[^a-z0-9_]/gi, '').toLowerCase(); // Permitir guión bajo

			link.download = `pedido_merch_${safeHolderName}_${safeDragName}_${safeItemName}_${saleIdShort}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			// No necesitamos revokeObjectURL para Data URLs

			showLoading(false);
			showInfoModal("PEDIDO DESCARGADO (PNG).<br>¡Pásaselo por Instagram a la drag!", false);

		} catch (error) {
			console.error("Error downloading merch QR image:", error);
			showLoading(false);
			showInfoModal("Error al descargar la imagen del pedido.", true);
		}
	}

	// --- FIN FUNCIONALIDAD DE MERCH PÚBLICO ---


	// --- Admin Panel Rendering ---
	// (renderAdminEvents se incluye en la siguiente parte)

	/**
	 * Renderiza la lista de drags en el panel de administración.
	 */
	function renderAdminDrags(drags) {
		clearDynamicListListeners('adminDrags');
		if (!adminDragListUl) return;
		adminDragListUl.innerHTML = ''; // Limpiar

		const dragsToShow = drags || [];

		if (dragsToShow.length === 0) {
			adminDragListUl.innerHTML = '<li class="text-gray-400 text-center font-pixel">NO HAY DRAGS REGISTRADAS.</li>';
			return;
		}

		[...dragsToShow].sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(drag => {
			try {
				const item = document.createElement('li');
				const cardColor = drag.cardColor || '#FFFFFF';
				const galleryCount = drag.galleryImages?.length || 0;
				const merchCount = drag.merchItems?.length || 0;
				item.className = "bg-gray-800 p-4 border border-gray-500";
				item.innerHTML = `
						<div class="flex flex-wrap justify-between items-center gap-y-2">
							<div class="flex-grow min-w-0 mr-4 flex items-center gap-2">
								 <span class="inline-block w-4 h-4 rounded-full border border-black" style="background-color: ${cardColor};"></span>
								<span class="font-pixel text-xl text-white truncate">${drag.name || 'Drag sin nombre'}</span>
								<span class="text-sm text-gray-400 block sm:inline truncate">(@${drag.instagramHandle || '---'})</span>
							</div>
							<div class="flex-shrink-0 flex items-center flex-wrap gap-2">
								<span class="text-sm text-blue-400 font-pixel">(${galleryCount} fotos)</span>
								<span class="text-sm text-pink-400 font-pixel">(${merchCount} merch)</span>
								<button data-drag-id="${drag.id}" class="edit-drag-btn bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-none text-sm font-pixel">EDITAR</button>
								<button data-drag-id="${drag.id}" class="delete-drag-btn bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-none text-sm font-pixel">ELIMINAR</button>
							</div>
						</div>`;
				adminDragListUl.appendChild(item);
			} catch (e) {
				console.error(`Error renderizando drag admin ${drag?.id}:`, e);
			}
		});

		// Re-adjuntar listeners
		adminDragListUl.querySelectorAll('.edit-drag-btn').forEach(btn => addTrackedListener(btn, 'click', handleEditDragClick));
		adminDragListUl.querySelectorAll('.delete-drag-btn').forEach(btn => addTrackedListener(btn, 'click', handleDeleteDrag));
	}

	/**
			 * Guarda los datos de una drag (nueva o existente). No maneja merch aquí.
			 * MODIFICADO: Lee las URLs de la galería del input oculto.
			 */
	async function handleSaveDrag(e) {
		e.preventDefault();
		if (!addDragForm || !appState) return;

		const dragIdToSave = editingDragId; // Puede ser null si es nueva
		const formData = new FormData(addDragForm);
		// Obtener referencia al input oculto de la galería
		const hiddenDragGalleryInput = document.getElementById('drag-gallery-urls');

		// Recoger y limpiar datos
		const dragName = formData.get('drag-name')?.trim() || '';
		const dragInsta = formData.get('drag-instagram')?.trim().replace('@', '') || '';
		const dragColor = formData.get('drag-card-color')?.trim() || '#FFFFFF';
		const dragDesc = formData.get('drag-description')?.trim() || '';
		const dragCoverUrl = formData.get('drag-cover-url')?.trim() || '';
		// --- MODIFICADO: Leer URLs del input oculto ---
		const dragGalleryUrls = (hiddenDragGalleryInput?.value || '')
			.split('\n')
			.filter(url => url); // Filtrar vacíos
		// --- FIN MODIFICADO ---

		// Validaciones básicas
		if (!dragName || !dragDesc) {
			showInfoModal("Nombre y Descripción son obligatorios.", true); return;
		}
		if (dragCoverUrl && !(dragCoverUrl.startsWith('http') || dragCoverUrl.startsWith('uploads/'))) {
			showInfoModal("La URL de portada no es válida (http o uploads/).", true); return;
		}
		if (!/^#[0-9A-F]{6}$/i.test(dragColor)) {
			showInfoModal("El color debe ser un código hexadecimal válido (ej: #F02D7D).", true); return;
		}
		// Ya no necesitamos validar las URLs de galería aquí, renderAdminGalleryGrid lo hizo

		showLoading(true);
		try {
			if (dragIdToSave !== null) { // Actualizar drag existente
				const dragIndex = appState.drags.findIndex(d => d.id === dragIdToSave);
				if (dragIndex > -1) {
					const existingDrag = appState.drags[dragIndex];
					// Actualizar solo los campos del formulario, MANTENER merchItems
					appState.drags[dragIndex] = {
						...existingDrag, // Mantiene ID, merchItems y cualquier otro campo no del form
						name: dragName,
						description: dragDesc,
						instagramHandle: dragInsta,
						cardColor: dragColor,
						coverImageUrl: dragCoverUrl,
						galleryImages: dragGalleryUrls // <-- Usar URLs del input oculto
					};
					await saveAppState(); // Guardar todo el appState
					showInfoModal("¡DRAG ACTUALIZADA!", false);
				} else {
					throw new Error("Drag a editar no encontrada.");
				}
			} else { // Añadir nueva drag
				const newDrag = {
					id: appState.nextDragId++, // Usar y luego incrementar el ID
					name: dragName,
					description: dragDesc,
					instagramHandle: dragInsta,
					cardColor: dragColor,
					coverImageUrl: dragCoverUrl,
					galleryImages: dragGalleryUrls, // <-- Usar URLs del input oculto
					merchItems: [] // Nueva drag siempre empieza sin merch
				};
				if (!Array.isArray(appState.drags)) appState.drags = []; // Asegurar array
				appState.drags.push(newDrag);
				await saveAppState(); // Guardar todo el appState
				showInfoModal("¡DRAG AÑADIDA!", false);
			}
			resetDragForm(); // Limpiar formulario (esto también limpia la rejilla)
			renderDragList(); // Actualizar lista pública
			renderAdminDrags(appState.drags); // Actualizar lista admin
			renderAdminMerch(); // Actualizar select de merch por si se añadió/cambió nombre
		} catch (error) {
			console.error("Error saving drag:", error);
			showInfoModal("Error al guardar la drag: " + error.message, true);
		} finally {
			showLoading(false);
		}
	}

	/**
			 * Resetea el formulario de añadir/editar drag.
			 * MODIFICADO: Limpia la rejilla de previsualización de la galería.
			 */
	function resetDragForm() {
		if (!addDragForm) return;
		addDragForm.reset();
		editingDragId = null; // Marcar que ya no se está editando
		addDragForm['edit-drag-id'].value = ''; // Limpiar campo oculto ID
		// Limpiar inputs de archivo
		if (dragCoverUploadInput) dragCoverUploadInput.value = '';
		if (dragGalleryUploadInput) dragGalleryUploadInput.value = '';

		// --- NUEVO: Limpiar la rejilla de galería ---
		if (adminDragGalleryPreviewGrid) {
			adminDragGalleryPreviewGrid.innerHTML = `<p class="text-gray-500 font-pixel text-center col-span-full self-center">Edita una drag existente o guarda una nueva para añadir imágenes.</p>`;
		}
		const hiddenDragGalleryInput = document.getElementById('drag-gallery-urls');
		if (hiddenDragGalleryInput) hiddenDragGalleryInput.value = '';
		// Limpiar listeners de borrado asociados a esta rejilla
		clearDynamicListListeners('delete-img-admin-drag-gallery-preview-grid');
		// --- FIN NUEVO ---

		// Restaurar botón a estado "Guardar"
		if (addDragFormButton) {
			addDragFormButton.textContent = "GUARDAR DRAG";
			addDragFormButton.classList.remove('bg-blue-600', 'hover:bg-blue-500');
			addDragFormButton.classList.add('bg-white', 'hover:bg-gray-300');
		}
	}

	/**
			 * Rellena el formulario de drag para editar una existente.
			 * MODIFICADO: Llama a renderAdminGalleryGrid para mostrar la galería.
			 */
	function handleEditDragClick(e) {
		const dragId = parseInt(e.target.dataset.dragId, 10);
		if (isNaN(dragId) || !appState || !appState.drags) return;

		const dragToEdit = appState.drags.find(d => d.id === dragId);
		if (!dragToEdit || !addDragForm) {
			showInfoModal("Error: Drag no encontrada para editar.", true);
			return;
		}

		// Rellenar formulario (campos básicos y portada)
		addDragForm['edit-drag-id'].value = dragToEdit.id;
		addDragForm['drag-name'].value = dragToEdit.name || '';
		addDragForm['drag-instagram'].value = dragToEdit.instagramHandle || '';
		addDragForm['drag-card-color'].value = dragToEdit.cardColor || '#FFFFFF';
		addDragForm['drag-description'].value = dragToEdit.description || '';
		addDragForm['drag-cover-url'].value = dragToEdit.coverImageUrl || '';

		// --- NUEVO: Renderizar la galería de la drag ---
		const dragGalleryUrls = dragToEdit.galleryImages || [];
		renderAdminGalleryGrid('admin-drag-gallery-preview-grid', 'drag-gallery-urls', dragGalleryUrls);
		// --- FIN NUEVO ---

		// No se rellena merch aquí

		editingDragId = dragToEdit.id; // Marcar que estamos editando

		// Cambiar estilo y texto del botón
		if (addDragFormButton) {
			addDragFormButton.textContent = "ACTUALIZAR DRAG";
			addDragFormButton.classList.add('bg-blue-600', 'hover:bg-blue-500');
			addDragFormButton.classList.remove('bg-white', 'hover:bg-gray-300');
		}

		// Scroll al formulario para visibilidad
		addDragForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}


	/**
	 * Elimina una drag y sus ventas de merch asociadas (simulación de confirmación).
	 */
	async function handleDeleteDrag(e) {
		const dragId = parseInt(e.target.dataset.dragId, 10);
		if (isNaN(dragId) || !appState || !appState.drags) return;

		const dragToDelete = appState.drags.find(d => d.id === dragId);
		if (!dragToDelete) return;

		// Simulación de confirmación - Ejecuta directamente la lógica de borrado
		console.warn(`Simulando confirmación para eliminar drag: ${dragToDelete.name} (ID: ${dragId})`);
		showLoading(true);
		try {
			// Filtrar la drag del estado principal
			appState.drags = appState.drags.filter(d => d.id !== dragId);

			// Filtrar las ventas de merch asociadas
			const initialSalesCount = allMerchSales.length;
			allMerchSales = allMerchSales.filter(s => s.dragId !== dragId);
			const removedSalesCount = initialSalesCount - allMerchSales.length;
			if (removedSalesCount > 0) {
				console.log(`Eliminadas ${removedSalesCount} ventas de merch asociadas a la drag ${dragId}.`);
			}

			// Si se estaba editando esta drag, resetear el form
			if (editingDragId === dragId) {
				resetDragForm();
			}

			// Guardar ambos estados actualizados
			await saveAppState();
			await saveMerchSalesState();

			showLoading(false);
			showInfoModal(`DRAG "${dragToDelete.name}" Y SUS VENTAS ELIMINADAS.`, false);

			// Re-renderizar vistas afectadas
			renderDragList(); // Lista pública
			renderAdminDrags(appState.drags); // Lista admin
			renderAdminMerch(); // Actualizar select y lista de merch admin

		} catch (error) {
			showLoading(false);
			console.error("Error deleting drag:", error);
			showInfoModal("Error al eliminar la drag: " + error.message, true);
		}
	}


	// --- Funciones Admin Merch ---

	/**
	 * Maneja el cambio de selección en el dropdown de dras (o web merch).
	 */
	function handleAdminMerchDragSelect(e) {
		const val = e.target.value;
		if (val === 'web') {
			currentAdminMerchDragId = 'web';
		} else if (val) {
			currentAdminMerchDragId = parseInt(val, 10);
		} else {
			currentAdminMerchDragId = null;
		}
		renderAdminMerch();
	}

	/**
	 * Renderiza la sección de admin de Merch (select de drag y lista de items).
	 */
	function renderAdminMerch() {
		if (!adminMerchSelectDrag || !adminMerchListContainer || !appState || !appState.drags) return;
		clearDynamicListListeners('adminMerchItems');

		// Guardar selección actual antes de limpiar
		const previousSelectedDragId = adminMerchSelectDrag.value;
		console.log("renderAdminMerch - Previous selection:", previousSelectedDragId);

		// Poblar select: Placeholder + Web Merch + Drags
		adminMerchSelectDrag.innerHTML = '<option value="">-- SELECCIONA UNA DRAG --</option>';

		// PRIMERO: Añadir opción Web Merch
		const webOption = document.createElement('option');
		webOption.value = 'web';
		webOption.textContent = 'RODETES OFICIAL (WEB MERCH)';
		webOption.style.fontWeight = 'bold';
		webOption.style.color = '#F02D7D';
		adminMerchSelectDrag.appendChild(webOption);

		// SEGUNDO: Añadir drags ordenadas
		[...(appState.drags)]
			.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
			.forEach(drag => {
				const option = document.createElement('option');
				option.value = drag.id;
				option.textContent = drag.name || `Drag ID ${drag.id}`;
				adminMerchSelectDrag.appendChild(option);
			});

		console.log("renderAdminMerch - Options added. Total:", adminMerchSelectDrag.options.length);

		// TERCERO: Restaurar selección si es válida
		if (previousSelectedDragId === 'web') {
			adminMerchSelectDrag.value = 'web';
			currentAdminMerchDragId = 'web';
			console.log("renderAdminMerch - Restored Web Merch");
		} else if (previousSelectedDragId && appState.drags.some(d => d.id === parseInt(previousSelectedDragId))) {
			adminMerchSelectDrag.value = previousSelectedDragId;
			currentAdminMerchDragId = parseInt(previousSelectedDragId);
			console.log("renderAdminMerch - Restored drag:", currentAdminMerchDragId);
		} else {
			// No hay selección válida previa
			currentAdminMerchDragId = null;
			adminMerchSelectDrag.value = "";
			console.log("renderAdminMerch - No valid previous selection");
		}

		// Renderizar lista de items o mensaje según la selección
		adminMerchListContainer.innerHTML = '';
		if (currentAdminMerchDragId === null) {
			adminMerchListContainer.innerHTML = '<li class="text-gray-400 text-center font-pixel">Selecciona una drag o Web Merch para ver/añadir items.</li>';
			addMerchItemForm?.classList.add('hidden'); // Ocultar form
			adminMerchSalesSummary?.classList.add('hidden'); // Ocultar resumen ventas
		} else {
			addMerchItemForm?.classList.remove('hidden'); // Mostrar form
			renderAdminMerchSalesSummary(); // Mostrar/Actualizar resumen ventas

			let merchItems = [];

			// --- LÓGICA DIFERENCIADA WEB vs DRAG ---
			if (currentAdminMerchDragId === 'web') {
				merchItems = appState.webMerch || [];
			} else {
				const drag = appState.drags.find(d => d.id === currentAdminMerchDragId);
				merchItems = drag?.merchItems || [];
			}

			if (merchItems.length === 0) {
				adminMerchListContainer.innerHTML = '<li class="text-gray-400 text-center font-pixel">No hay artículos de merchandising añadidos.</li>';
			} else {
				merchItems.forEach(item => {

					try {
						const li = document.createElement('li');
						li.className = "bg-gray-800 p-4 border border-gray-500 flex flex-wrap justify-between items-center gap-4";
						const itemImageUrl = item.imageUrl || 'https://placehold.co/60x60/333/ccc?text=?&font=vt323';
						const price = (item.price || 0).toFixed(2);

						li.innerHTML = `
								<div class="flex items-center gap-4 flex-grow min-w-0">
									<img src="${itemImageUrl}" alt="${item.name || 'Artículo'}" class="w-12 h-12 object-contain border border-gray-600 flex-shrink-0" onerror="this.onerror=null;this.src='https://placehold.co/60x60/333/ccc?text=ERR&font=vt323';">
									<div class="min-w-0">
										<span class="font-pixel text-lg text-white block truncate" title="${item.name || ''}">${item.name || 'Artículo sin nombre'}</span>
										<span class="text-base text-blue-400 font-bold">${price}€</span>
									</div>
								</div>
								<div class="flex space-x-2 flex-shrink-0">
									<button data-merch-id="${item.id}" class="edit-merch-btn bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-none text-sm font-pixel">EDITAR</button>
									<button data-merch-id="${item.id}" class="delete-merch-btn bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-none text-sm font-pixel">ELIMINAR</button>
								</div>
							`;
						adminMerchListContainer.appendChild(li);
					} catch (e) {
						console.error(`Error renderizando item merch admin ${item?.id}:`, e);
					}
				});

				// Añadir listeners a los botones de la lista
				adminMerchListContainer.querySelectorAll('.edit-merch-btn').forEach(btn => addTrackedListener(btn, 'click', handleEditMerchItemClick));
				adminMerchListContainer.querySelectorAll('.delete-merch-btn').forEach(btn => addTrackedListener(btn, 'click', handleDeleteMerchItem));
			}
		}
		// Resetea siempre el form al cambiar de drag o renderizar
		resetMerchItemForm();
	}

	/**
	 * Renderiza el resumen de ventas (solo entregadas) para la drag seleccionada.
	 */
	function renderAdminMerchSalesSummary() {
		if (!adminMerchSalesSummary || !adminMerchTotalItems || !adminMerchTotalRevenue || !adminMerchViewSalesBtn || currentAdminMerchDragId === null) return;

		adminMerchSalesSummary.classList.remove('hidden'); // Asegurar visibilidad

		const salesForDrag = (allMerchSales || []).filter(s => s.dragId === currentAdminMerchDragId);
		const deliveredSales = salesForDrag.filter(s => s.status === 'Delivered');
		const pendingSalesCount = salesForDrag.length - deliveredSales.length;

		let totalItemsDelivered = 0;
		let totalRevenueDelivered = 0;

		deliveredSales.forEach(sale => {
			totalItemsDelivered += sale.quantity || 0; // Sumar cantidad
			totalRevenueDelivered += (sale.quantity || 0) * (sale.itemPrice || 0); // Sumar ingresos
		});

		adminMerchTotalItems.textContent = totalItemsDelivered.toString();
		adminMerchTotalRevenue.textContent = totalRevenueDelivered.toFixed(2) + ' €';

		// Actualizar botón "Ver Lista"
		if (salesForDrag.length > 0) {
			adminMerchViewSalesBtn.textContent = `VER LISTA PEDIDOS (${pendingSalesCount} PENDIENTES)`;
			adminMerchViewSalesBtn.disabled = false;
		} else {
			adminMerchViewSalesBtn.textContent = `NO HAY PEDIDOS REGISTRADOS`;
			adminMerchViewSalesBtn.disabled = true;
		}
	}

	/**
	 * Muestra el modal con la lista completa de pedidos de merch para la drag actual.
	 */
	function handleViewMerchSales() {
		if (!merchSalesListModal || !merchSalesListTitle || !merchSalesListContent || currentAdminMerchDragId === null || !appState || !appState.drags) return;

		const drag = appState.drags.find(d => d.id === currentAdminMerchDragId);
		if (!drag) {
			showInfoModal("Error: Drag no encontrada.", true);
			return;
		}

		merchSalesListTitle.textContent = `Pedidos de Merch: ${drag.name || 'Drag'}`;
		renderMerchSalesList(); // Renderizar la lista al abrir
		merchSalesListModal.classList.remove('hidden');
	}

	/**
	 * Renderiza la lista de todos los pedidos (pendientes y entregados) en el modal.
	 * MODIFICADO: Muestra nombre y apellidos del comprador.
	 */
	function renderMerchSalesList() {
		if (!merchSalesListContent || currentAdminMerchDragId === null) return;

		clearDynamicListListeners('merchSalesList'); // Limpiar listeners antiguos
		merchSalesListContent.innerHTML = ''; // Limpiar contenido

		const salesForDrag = (allMerchSales || [])
			.filter(s => s.dragId === currentAdminMerchDragId)
			.sort((a, b) => (b.saleDate && a.saleDate) ? new Date(b.saleDate) - new Date(a.saleDate) : 0); // Más recientes primero

		if (salesForDrag.length === 0) {
			merchSalesListContent.innerHTML = '<p class="text-gray-400 text-center font-pixel">NO HAY PEDIDOS DE MERCH REGISTRADOS PARA ESTA DRAG.</p>';
			return;
		}

		let listHtml = `<ul class="text-left space-y-4">`;
		salesForDrag.forEach(sale => {
			try {
				const isPending = sale.status === 'Pending';
				const statusText = isPending ? 'PENDIENTE' : 'ENTREGADO';
				const statusColor = isPending ? 'text-yellow-400' : 'text-green-400';
				const totalAmount = ((sale.itemPrice || 0) * (sale.quantity || 0)).toFixed(2);
				const saleDateStr = sale.saleDate ? new Date(sale.saleDate).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha N/A';
				const saleIdShort = (sale.saleId || 'N/A').substring(0, 8);
				// NUEVO: Obtener nombre completo
				const buyerName = `${sale.nombre || ''} ${sale.apellidos || ''}`.trim() || 'Nombre N/A';

				const buttonHtml = isPending
					? `<button data-sale-id="${sale.saleId}" class="mark-delivered-btn bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-none text-sm font-pixel">MARCAR ENTREGADO</button>`
					: `<span class="text-gray-500 px-3 py-1 text-sm font-pixel">CONFIRMADO</span>`; // No botón si ya está entregado

				listHtml += `
						<li class="p-3 bg-gray-800 border border-gray-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
							<div class="min-w-0 flex-grow">
								<span class="font-pixel text-lg text-white block truncate" title="${sale.itemName || ''}">${sale.itemName || 'Artículo'} x ${sale.quantity || '?'}</span>
								<span class="text-sm ${statusColor} font-bold block">${statusText} (${totalAmount} €)</span>
								<!-- MODIFICADO: Mostrar Nombre y Apellidos -->
								<span class="text-xs text-gray-400 block break-words" title="${buyerName}">${buyerName}</span>
								<span class="text-xs text-gray-500 block break-all" title="${sale.email || ''}">Email: ${sale.email || 'N/A'}</span>
								<span class="text-xs text-gray-500 block">ID: ${saleIdShort}... (${saleDateStr})</span>
							</div>
							<div class="flex-shrink-0 mt-2 sm:mt-0">
								${buttonHtml}
							</div>
						</li>
					`;
			} catch (e) {
				console.error(`Error renderizando venta ${sale?.saleId}:`, e);
			}
		});
		listHtml += '</ul>';
		merchSalesListContent.innerHTML = listHtml;

		// Add dynamic listener for delivery buttons
		merchSalesListContent.querySelectorAll('.mark-delivered-btn').forEach(btn => {
			addTrackedListener(btn, 'click', handleMarkMerchDelivered);
		});
	}

	/**
	 * Marca un pedido de merch como entregado (simulación de confirmación).
	 */
	async function handleMarkMerchDelivered(e) {
		const saleId = e.currentTarget.dataset.saleId;
		if (!saleId || !allMerchSales) return;

		const saleIndex = allMerchSales.findIndex(s => s.saleId === saleId);
		if (saleIndex === -1) {
			showInfoModal("Error: Pedido no encontrado.", true); return;
		}
		if (allMerchSales[saleIndex].status === 'Delivered') {
			showInfoModal("Este pedido ya está marcado como entregado.", false); return; // Ya hecho
		}

		// Simulación de confirmación - Ejecuta la acción directamente
		console.warn(`Simulando confirmación de entrega para pedido: ${saleId}`);
		showLoading(true);
		try {
			allMerchSales[saleIndex].status = 'Delivered';
			await saveMerchSalesState(); // Guardar el cambio

			// Re-renderizar lista y resumen
			renderMerchSalesList(); // Actualizar modal si está abierto
			renderAdminMerchSalesSummary(); // Actualizar resumen en la pestaña merch

			showLoading(false);
			showInfoModal(`¡PEDIDO ${saleIdShort(saleId)} CONFIRMADO COMO ENTREGADO!`, false);

		} catch (error) {
			showLoading(false);
			console.error("Error marking merch delivered:", error);
			// Revertir cambio en memoria si falla el guardado? Podría ser, pero complica.
			// Por ahora, solo mostramos error.
			allMerchSales[saleIndex].status = 'Pending'; // Revertir visualmente (si el guardado falló)
			renderMerchSalesList();
			renderAdminMerchSalesSummary();
			showInfoModal("Error al confirmar la entrega: " + error.message, true);
		}
	}

	// Helper para ID corto
	function saleIdShort(id) { return (id || 'N/A').substring(0, 8); }


	/**
	 * Maneja el cambio en el select de drag en admin merch.
	 */
	function handleAdminMerchDragSelect() {
		if (!adminMerchSelectDrag) return;
		currentAdminMerchDragId = adminMerchSelectDrag.value ? parseInt(adminMerchSelectDrag.value) : null;
		renderAdminMerch(); // Re-renderizar la sección con la drag seleccionada
	}


	/**
	 * Resetea el formulario de añadir/editar item de merch.
	 */
	function resetMerchItemForm() {
		if (!addMerchItemForm) return;
		addMerchItemForm.reset();
		editingMerchItemId = null; // No estamos editando
		addMerchItemForm['edit-merch-item-id'].value = ''; // Limpiar ID oculto
		if (merchItemImageUploadInput) merchItemImageUploadInput.value = ''; // Limpiar input file

		// Restaurar botón
		if (addMerchItemFormButton) {
			addMerchItemFormButton.textContent = "AÑADIR ARTÍCULO";
			addMerchItemFormButton.classList.remove('bg-blue-600', 'hover:bg-blue-500');
			addMerchItemFormButton.classList.add('bg-white', 'hover:bg-gray-300'); // Estilo por defecto
		}
	}

	/**
	 * Rellena el form de merch para editar un item existente.
	 */
	function handleEditMerchItemClick(e) {
		if (currentAdminMerchDragId === null || !appState) return;
		const merchId = parseInt(e.target.dataset.merchId, 10);
		if (isNaN(merchId)) return;

		let itemToEdit = null;
		if (currentAdminMerchDragId === 'web') {
			itemToEdit = appState.webMerch?.find(item => item.id === merchId);
		} else {
			const drag = appState.drags.find(d => d.id === currentAdminMerchDragId);
			itemToEdit = drag?.merchItems?.find(item => item.id === merchId);
		}

		if (!itemToEdit || !addMerchItemForm) {
			showInfoModal("Error: Artículo no encontrado para editar.", true);
			return;
		}

		// Rellenar formulario
		addMerchItemForm['edit-merch-item-id'].value = itemToEdit.id;
		addMerchItemForm['merch-item-name'].value = itemToEdit.name || '';
		addMerchItemForm['merch-item-price'].value = itemToEdit.price || 0;
		addMerchItemForm['merch-item-image-url'].value = itemToEdit.imageUrl || '';

		editingMerchItemId = itemToEdit.id; // Marcar como editando

		// Cambiar botón
		if (addMerchItemFormButton) {
			addMerchItemFormButton.textContent = "ACTUALIZAR ARTÍCULO";
			addMerchItemFormButton.classList.add('bg-blue-600', 'hover:bg-blue-500');
			addMerchItemFormButton.classList.remove('bg-white', 'hover:bg-gray-300');
		}
		addMerchItemForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	/**
	 * Guarda un nuevo item de merch o actualiza uno existente para la drag seleccionada.
	 */
	async function handleSaveMerchItem(e) {
		e.preventDefault();
		if (!addMerchItemForm || currentAdminMerchDragId === null || !appState) return;

		// Determinar dónde guardar (Web o Drag)
		let targetArray = null;
		let contextName = "";
		let dragIndex = -1;

		if (currentAdminMerchDragId === 'web') {
			if (!appState.webMerch) appState.webMerch = [];
			targetArray = appState.webMerch;
			contextName = "Web Merch";
		} else {
			dragIndex = appState.drags.findIndex(d => d.id === currentAdminMerchDragId);
			if (dragIndex === -1) {
				showInfoModal("Error: Drag no encontrada para guardar el artículo.", true); return;
			}
			if (!appState.drags[dragIndex].merchItems) appState.drags[dragIndex].merchItems = [];
			targetArray = appState.drags[dragIndex].merchItems;
			contextName = appState.drags[dragIndex].name || "Drag";
		}

		const formData = new FormData(addMerchItemForm);
		const itemIdToSave = editingMerchItemId; // Null si es nuevo
		const itemName = formData.get('merch-item-name')?.trim() || '';
		const itemPrice = parseFloat(formData.get('merch-item-price'));
		const itemImageUrl = formData.get('merch-item-image-url')?.trim() || '';

		// Validaciones
		if (!itemName) {
			showInfoModal("El nombre del artículo es obligatorio.", true); return;
		}
		if (isNaN(itemPrice) || itemPrice < 0) {
			showInfoModal("El precio debe ser un número válido (0 o mayor).", true); return;
		}
		if (itemImageUrl && !(itemImageUrl.startsWith('http') || itemImageUrl.startsWith('uploads/'))) {
			showInfoModal("La URL de imagen no es válida (http o uploads/).", true); return;
		}

		showLoading(true);
		try {
			// (Ya tenemos targetArray definido arriba)
			const merchItems = targetArray; // Referencia al array correcto

			if (itemIdToSave !== null) { // Actualizar item existente
				const itemIndex = merchItems.findIndex(item => item.id === itemIdToSave);
				if (itemIndex > -1) {
					merchItems[itemIndex] = {
						...merchItems[itemIndex], // Mantener ID
						name: itemName,
						price: itemPrice,
						imageUrl: itemImageUrl
					};
					await saveAppState(); // Guardar todo el appState
					showInfoModal(`¡Artículo de ${contextName} actualizado!`, false);
				} else { throw new Error("Artículo a editar no encontrado."); }
			} else { // Añadir nuevo item
				const newItem = {
					id: appState.nextMerchItemId++, // Usar ID global y luego incrementar
					name: itemName,
					price: itemPrice,
					imageUrl: itemImageUrl
				};
				merchItems.push(newItem); // Añadir al array correcto
				await saveAppState(); // Guardar todo el appState
				showInfoModal(`¡Artículo añadido a ${contextName}!`, false);
			}
			resetMerchItemForm(); // Limpiar formulario
			renderAdminMerch(); // Re-renderizar la sección de merch admin

			// Re-renderizar vistas públicas
			renderDragList();
			renderMerchPage(); // Re-renderizar página pública de merch

		} catch (error) {
			console.error("Error saving merch item:", error);
			showInfoModal("Error al guardar el artículo de merch: " + error.message, true);
		} finally {
			showLoading(false);
		}
	}

	/**
	 * Elimina un item de merch de la drag seleccionada (simulación de confirmación).
	 */
	async function handleDeleteMerchItem(e) {
		if (currentAdminMerchDragId === null || !appState || !appState.drags) return;
		const merchId = parseInt(e.target.dataset.merchId, 10);
		if (isNaN(merchId)) return;

		let targetArray = null;
		if (currentAdminMerchDragId === 'web') {
			targetArray = appState.webMerch;
		} else {
			const dragIndex = appState.drags.findIndex(d => d.id === currentAdminMerchDragId);
			if (dragIndex === -1) return;
			targetArray = appState.drags[dragIndex].merchItems;
		}

		if (!targetArray) return;

		const itemIndex = targetArray.findIndex(item => item.id === merchId);
		if (itemIndex === -1) {
			showInfoModal("Error: Artículo no encontrado para eliminar.", true); return; // Item no encontrado
		}

		const itemName = dragMerchItems[itemIndex].name || 'este artículo';

		// Simulación de confirmación
		console.warn(`Simulando confirmación para eliminar merch: ${itemName} (ID: ${merchId})`);
		showLoading(true);
		try {
			// Eliminar el item del array
			targetArray.splice(itemIndex, 1);

			// Si se estaba editando este item, resetear el form
			if (editingMerchItemId === merchId) {
				resetMerchItemForm();
			}

			// Guardar el estado de la aplicación (que ahora tiene el item menos)
			await saveAppState();
			// Nota: NO eliminamos las ventas asociadas (historial)

			showLoading(false);
			showInfoModal(`Artículo "${itemName}" eliminado.`, false);

			// Re-renderizar vistas
			renderAdminMerch(); // Actualizar lista admin
			renderDragList(); // Actualizar contador en lista pública

		} catch (error) {
			showLoading(false);
			// Revertir cambio en memoria si falla guardado? Podría ser.
			console.error("Error deleting merch item:", error);
			showInfoModal("Error al eliminar el artículo: " + error.message, true);
		}
	}


	// ========== NUEVO SISTEMA DUAL DE MERCH ==========
	// Variables para controlar el estado de edición en el nuevo sistema
	let editingWebMerchId = null;
	let editingDragMerchId = null;
	let currentSelectedDragForMerch = null;

	// ===== WEB MERCH FUNCTIONS =====

	/**
		* Muestra el formulario de Web Merch para añadir un nuevo artículo
		*/
	function showWebMerchForm() {
		if (!webMerchForm) return;
		webMerchForm.classList.remove('hidden');
		resetWebMerchForm();
	}

	/**
	 * Oculta y resetea el formulario de Web Merch
	 */
	function hideWebMerchForm() {
		if (!webMerchForm) return;
		webMerchForm.classList.add('hidden');
		resetWebMerchForm();
	}

	/**
	 * Resetea el formulario de Web Merch
	 */
	function resetWebMerchForm() {
		if (!webMerchForm) return;
		webMerchForm.reset();
		editingWebMerchId = null;
		const editIdInput = document.getElementById('edit-web-merch-id');
		if (editIdInput) editIdInput.value = '';
		const uploadInput = document.getElementById('web-merch-image-upload');
		if (uploadInput) uploadInput.value = '';
	}

	/**
	 * Renderiza la lista de Web Merch en el admin
	 */
	function renderWebMerchList() {
		if (!webMerchListContainer || !appState || !appState.webMerch) return;
		clearDynamicListListeners('webMerchList');
		webMerchListContainer.innerHTML = '';

		const webMerchItems = appState.webMerch || [];

		if (webMerchItems.length === 0) {
			webMerchListContainer.innerHTML = '<li class="text-gray-400 text-center font-pixel">No hay artículos de Web Merch.</li>';
			return;
		}

		webMerchItems.forEach(item => {
			try {
				const li = document.createElement('li');
				li.className = "bg-gray-800 p-4 border border-gray-500 flex flex-wrap justify-between items-center gap-4";
				const itemImageUrl = item.imageUrl || 'https://placehold.co/60x60/333/ccc?text=?&font=vt323';
				const price = (item.price || 0).toFixed(2);

				li.innerHTML = `
					<div class="flex items-center gap-4 flex-grow min-w-0">
						<img src="${itemImageUrl}" alt="${item.name || 'Artículo'}" class="w-12 h-12 object-contain border border-gray-600 flex-shrink-0" onerror="this.onerror=null;this.src='https://placehold.co/60x60/333/ccc?text=ERR&font=vt323';">
						<div class="min-w-0">
							<span class="font-pixel text-lg text-white block truncate" title="${item.name || ''}">${item.name || 'Artículo sin nombre'}</span>
							<span class="text-base text-blue-400 font-bold">${price}€</span>
						</div>
					</div>
					<div class="flex space-x-2 flex-shrink-0">
						<button data-web-merch-id="${item.id}" class="edit-web-merch-btn bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-none text-sm font-pixel">EDITAR</button>
						<button data-web-merch-id="${item.id}" class="delete-web-merch-btn bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-none text-sm font-pixel">ELIMINAR</button>
					</div>
				`;
				webMerchListContainer.appendChild(li);
			} catch (e) {
				console.error(`Error renderizando Web Merch item ${item?.id}:`, e);
			}
		});

		// Añadir listeners
		webMerchListContainer.querySelectorAll('.edit-web-merch-btn').forEach(btn => addTrackedListener(btn, 'click', handleEditWebMerch));
		webMerchListContainer.querySelectorAll('.delete-web-merch-btn').forEach(btn => addTrackedListener(btn, 'click', handleDeleteWebMerch));
	}

	/**
	 * Maneja el guardado de Web Merch (crear o editar)
	 */
	async function handleSaveWebMerch(e) {
		e.preventDefault();
		if (!webMerchForm || !appState) return;

		const formData = new FormData(webMerchForm);
		const itemName = formData.get('web-merch-name')?.trim() || '';
		const itemPrice = parseFloat(formData.get('web-merch-price'));
		const itemImageUrl = formData.get('web-merch-image-url')?.trim() || '';

		// Validaciones
		if (!itemName) {
			showInfoModal("El nombre del artículo es obligatorio.", true);
			return;
		}
		if (isNaN(itemPrice) || itemPrice < 0) {
			showInfoModal("El precio debe ser un número válido (0 o mayor).", true);
			return;
		}

		showLoading(true);
		try {
			if (!appState.webMerch) appState.webMerch = [];

			if (editingWebMerchId !== null) {
				// Actualizar item existente
				const itemIndex = appState.webMerch.findIndex(item => item.id === editingWebMerchId);
				if (itemIndex > -1) {
					appState.webMerch[itemIndex] = {
						...appState.webMerch[itemIndex],
						name: itemName,
						price: itemPrice,
						imageUrl: itemImageUrl
					};
					await saveAppState();
					showInfoModal('¡Artículo de Web Merch actualizado!', false);
				} else {
					throw new Error("Artículo a editar no encontrado.");
				}
			} else {
				// Añadir nuevo item
				const newItem = {
					id: appState.nextMerchItemId++,
					name: itemName,
					price: itemPrice,
					imageUrl: itemImageUrl
				};
				appState.webMerch.push(newItem);
				await saveAppState();
				showInfoModal('¡Artículo añadido a Web Merch!', false);
			}

			hideWebMerchForm();
			renderWebMerchList();
			renderWebMerchSalesSummary();
			renderMerchPage(); // Re-renderizar página pública
		} catch (error) {
			console.error("Error saving Web Merch item:", error);
			showInfoModal("Error al guardar el artículo: " + error.message, true);
		} finally {
			showLoading(false);
		}
	}

	/**
	 * Maneja la edición de un artículo de Web Merch
	 */
	function handleEditWebMerch(e) {
		if (!appState || !webMerchForm) return;
		const merchId = parseInt(e.currentTarget.dataset.webMerchId, 10);
		if (isNaN(merchId)) return;

		const itemToEdit = appState.webMerch?.find(item => item.id === merchId);
		if (!itemToEdit) {
			showInfoModal("Error: Artículo no encontrado para editar.", true);
			return;
		}

		// Rellenar formulario
		const editIdInput = document.getElementById('edit-web-merch-id');
		if (editIdInput) editIdInput.value = itemToEdit.id;

		const nameInput = document.getElementById('web-merch-name');
		if (nameInput) nameInput.value = itemToEdit.name || '';

		const priceInput = document.getElementById('web-merch-price');
		if (priceInput) priceInput.value = itemToEdit.price || 0;

		if (webMerchImageUrlInput) webMerchImageUrlInput.value = itemToEdit.imageUrl || '';

		editingWebMerchId = itemToEdit.id;
		webMerchForm.classList.remove('hidden');
		webMerchForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	/**
	 * Maneja la eliminación de un artículo de Web Merch
	 */
	async function handleDeleteWebMerch(e) {
		if (!appState) return;
		const merchId = parseInt(e.currentTarget.dataset.webMerchId, 10);
		if (isNaN(merchId)) return;

		const itemIndex = appState.webMerch?.findIndex(item => item.id === merchId);
		if (itemIndex === undefined || itemIndex === -1) {
			showInfoModal("Error: Artículo no encontrado.", true);
			return;
		}

		const itemName = appState.webMerch[itemIndex].name || 'este artículo';

		console.warn(`Simulando confirmación para eliminar Web Merch: ${itemName} (ID: ${merchId})`);
		showLoading(true);
		try {
			appState.webMerch.splice(itemIndex, 1);

			if (editingWebMerchId === merchId) {
				resetWebMerchForm();
			}

			await saveAppState();
			showLoading(false);
			showInfoModal(`Artículo "${itemName}" eliminado.`, false);

			renderWebMerchList();
			renderWebMerchSalesSummary();
			renderMerchPage();
		} catch (error) {
			showLoading(false);
			console.error("Error deleting Web Merch item:", error);
			showInfoModal("Error al eliminar el artículo: " + error.message, true);
		}
	}

	/**
	 * Renderiza el resumen de ventas de Web Merch
	 */
	function renderWebMerchSalesSummary() {
		if (!webMerchSalesSummary || !webMerchTotalItems || !webMerchTotalRevenue || !webMerchViewSalesBtn) return;

		const salesForWeb = (allMerchSales || []).filter(s => s.dragId === 'web');
		const deliveredSales = salesForWeb.filter(s => s.status === 'Delivered');
		const pendingSalesCount = salesForWeb.length - deliveredSales.length;

		let totalItemsDelivered = 0;
		let totalRevenueDelivered = 0;

		deliveredSales.forEach(sale => {
			totalItemsDelivered += sale.quantity || 0;
			totalRevenueDelivered += (sale.quantity || 0) * (sale.itemPrice || 0);
		});

		webMerchTotalItems.textContent = totalItemsDelivered.toString();
		webMerchTotalRevenue.textContent = totalRevenueDelivered.toFixed(2) + ' €';

		if (salesForWeb.length > 0) {
			webMerchViewSalesBtn.textContent = `VER LISTA PEDIDOS (${pendingSalesCount} PENDIENTES)`;
			webMerchViewSalesBtn.disabled = false;
		} else {
			webMerchViewSalesBtn.textContent = `NO HAY PEDIDOS REGISTRADOS`;
			webMerchViewSalesBtn.disabled = true;
		}
	}

	/**
	 * Muestra el modal con la lista de ventas de Web Merch
	 */
	function handleViewWebMerchSales() {
		if (!merchSalesListModal || !merchSalesListTitle || !merchSalesListContent) return;

		merchSalesListTitle.textContent = `Pedidos de Merch: RODETES OFICIAL (WEB)`;
		renderMerchSalesListForDrag('web');
		merchSalesListModal.classList.remove('hidden');
	}

	/**
	 * Renderiza la lista de ventas de merch para una drag específica (o 'web')
	 */
	function renderMerchSalesListForDrag(dragId) {
		if (!merchSalesListContent) return;

		clearDynamicListListeners('merchSalesListForDrag');
		merchSalesListContent.innerHTML = '';

		const salesForDrag = (allMerchSales || [])
			.filter(s => s.dragId === dragId)
			.sort((a, b) => (b.saleDate && a.saleDate) ? new Date(b.saleDate) - new Date(a.saleDate) : 0);

		if (salesForDrag.length === 0) {
			merchSalesListContent.innerHTML = '<p class="text-gray-400 text-center font-pixel">NO HAY PEDIDOS REGISTRADOS.</p>';
			return;
		}

		let listHtml = `<ul class="text-left space-y-4">`;
		salesForDrag.forEach(sale => {
			try {
				const isPending = sale.status === 'Pending';
				const statusText = isPending ? 'PENDIENTE' : 'ENTREGADO';
				const statusColor = isPending ? 'text-yellow-400' : 'text-green-400';
				const totalAmount = ((sale.itemPrice || 0) * (sale.quantity || 0)).toFixed(2);
				const saleDateStr = sale.saleDate ? new Date(sale.saleDate).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha N/A';
				const saleIdShort = (sale.saleId || 'N/A').substring(0, 8);
				const buyerName = `${sale.nombre || ''} ${sale.apellidos || ''}`.trim() || 'Nombre N/A';

				const buttonHtml = isPending
					? `<div class="flex flex-col sm:flex-row gap-2">
						<button data-sale-id="${sale.saleId}" class="mark-merch-delivered-btn bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-none text-sm font-pixel">MARCAR ENTREGADO</button>
						<button data-sale-id="${sale.saleId}" class="delete-merch-order-btn bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-none text-sm font-pixel">BORRAR</button>
					   </div>`
					: `<div class="flex flex-col sm:flex-row gap-2 items-center">
						<span class="text-gray-500 px-3 py-1 text-sm font-pixel">CONFIRMADO</span>
						<button data-sale-id="${sale.saleId}" class="delete-merch-order-btn bg-red-900 hover:bg-red-700 text-white px-3 py-1 rounded-none text-sm font-pixel text-xs">BORRAR</button>
					   </div>`;

				listHtml += `
					<li class="p-3 bg-gray-800 border border-gray-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
						<div class="min-w-0 flex-grow">
							<span class="font-pixel text-lg text-white block truncate" title="${sale.itemName || ''}">${sale.itemName || 'Artículo'} x ${sale.quantity || '?'}</span>
							<span class="text-sm ${statusColor} font-bold block">${statusText} (${totalAmount} €)</span>
							<span class="text-xs text-gray-400 block break-words" title="${buyerName}">${buyerName}</span>
							<span class="text-xs text-gray-500 block break-all" title="${sale.email || ''}">Email: ${sale.email || 'N/A'}</span>
							<span class="text-xs text-gray-500 block">ID: ${saleIdShort}... (${saleDateStr})</span>
						</div>
						<div class="flex-shrink-0 mt-2 sm:mt-0">
							${buttonHtml}
						</div>
					</li>
				`;
			} catch (e) {
				console.error(`Error renderizando  venta ${sale?.saleId}:`, e);
			}
		});
		listHtml += '</ul>';
		merchSalesListContent.innerHTML = listHtml;

		// Añadir listeners para botones de marcar entregado
		merchSalesListContent.querySelectorAll('.mark-merch-delivered-btn').forEach(btn => {
			addTrackedListener(btn, 'click', handleMarkMerchDeliveredFromList);
		});

		// NUEVO: Listeners para borrar pedido
		merchSalesListContent.querySelectorAll('.delete-merch-order-btn').forEach(btn => {
			addTrackedListener(btn, 'click', handleDeleteMerchOrder); // Definir función abajo
		});
	}

	/**
	 * Elimina un pedido de merch (por error o cancelación)
	 */
	async function handleDeleteMerchOrder(e) {
		const saleId = e.currentTarget.dataset.saleId;
		if (!saleId || !allMerchSales) return;

		if (!confirm("¿Seguro que quieres ELIMINAR este pedido permanentemente? Esta acción es irreversible.")) {
			return;
		}

		const saleIndex = allMerchSales.findIndex(s => s.saleId === saleId);
		if (saleIndex === -1) {
			showInfoModal("Error: Pedido no encontrado.", true);
			return;
		}

		showLoading(true);
		try {
			// Eliminar del array
			allMerchSales.splice(saleIndex, 1);
			await saveMerchSalesState(); // Guardar cambios

			// Re-renderizar
			if (currentSelectedDragForMerch) {
				renderMerchSalesListForDrag(currentSelectedDragForMerch);
				renderDragMerchSalesSummary(); // Actualizar totales
			} else {
				// Si por alguna razón no hay drag seleccionada (raro), recargar todo
				renderDragMerchSalesSummary();
			}

			showInfoModal("Pedido eliminado correctamente.", false);
		} catch (err) {
			console.error("Error eliminando pedido:", err);
			showInfoModal("Error al eliminar el pedido.", true);
		} finally {
			showLoading(false);
		}
	}

	/**
	 * Marca un pedido de merch como entregado desde la lista
	 */
	async function handleMarkMerchDeliveredFromList(e) {
		const saleId = e.currentTarget.dataset.saleId;
		if (!saleId || !allMerchSales) return;

		const saleIndex = allMerchSales.findIndex(s => s.saleId === saleId);
		if (saleIndex === -1) {
			showInfoModal("Error: Pedido no encontrado.", true);
			return;
		}
		if (allMerchSales[saleIndex].status === 'Delivered') {
			showInfoModal("Este pedido ya está marcado como entregado.", false);
			return;
		}

		console.warn(`Simulando confirmación de entrega para pedido: ${saleId}`);
		showLoading(true);
		try {
			allMerchSales[saleIndex].status = 'Delivered';
			await saveMerchSalesState();

			// Re-renderizar la lista actual y los resúmenes
			const dragId = allMerchSales[saleIndex].dragId;
			renderMerchSalesListForDrag(dragId);

			if (dragId === 'web') {
				renderWebMerchSalesSummary();
			} else {
				renderDragMerchSalesSummary();
			}

			showLoading(false);
			showInfoModal(`¡PEDIDO ${saleId.substring(0, 8)} CONFIRMADO COMO ENTREGADO!`, false);
		} catch (error) {
			showLoading(false);
			console.error("Error marking merch delivered:", error);
			allMerchSales[saleIndex].status = 'Pending'; // Revertir
			renderMerchSalesListForDrag(allMerchSales[saleIndex].dragId);
			showInfoModal("Error al confirmar la entrega: " + error.message, true);
		}
	}

	// ===== DRAG MERCH FUNCTIONS =====

	/**
	 * Renderiza el selector de drags para Drag Merch
	 */
	function renderDragMerchSelect() {
		if (!dragMerchSelectDrag || !appState || !appState.drags) return;

		const previousSelectedDragId = dragMerchSelectDrag.value;

		dragMerchSelectDrag.innerHTML = '<option value="">-- SELECCIONA UNA DRAG --</option>';

		[...(appState.drags)]
			.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
			.forEach(drag => {
				const option = document.createElement('option');
				option.value = drag.id;
				option.textContent = drag.name || `Drag ID ${drag.id}`;
				dragMerchSelectDrag.appendChild(option);
			});

		// Restaurar selección si es válida
		if (previousSelectedDragId && appState.drags.some(d => d.id === parseInt(previousSelectedDragId))) {
			dragMerchSelectDrag.value = previousSelectedDragId;
			currentSelectedDragForMerch = parseInt(previousSelectedDragId);
		} else {
			currentSelectedDragForMerch = null;
		}

		renderDragMerchList();
	}

	/**
	 * Maneja el cambio de selección de drag para Drag Merch
	 */
	function handleDragMerchSelectChange(e) {
		const val = e.target.value;
		if (val) {
			currentSelectedDragForMerch = parseInt(val, 10);
		} else {
			currentSelectedDragForMerch = null;
		}
		renderDragMerchList();
		renderDragMerchSalesSummary();
	}

	/**
	 * Muestra el formulario de Drag Merch
	 */
	function showDragMerchForm() {
		if (!dragMerchForm) return;
		dragMerchForm.classList.remove('hidden');
		resetDragMerchForm();
	}

	/**
	 * Oculta y resetea el formulario de Drag Merch
	 */
	function hideDragMerchForm() {
		if (!dragMerchForm) return;
		dragMerchForm.classList.add('hidden');
		resetDragMerchForm();
	}

	/**
	 * Resetea el formulario de Drag Merch
	 */
	function resetDragMerchForm() {
		if (!dragMerchForm) return;
		dragMerchForm.reset();
		editingDragMerchId = null;
		const editIdInput = document.getElementById('edit-drag-merch-id');
		if (editIdInput) editIdInput.value = '';
		const uploadInput = document.getElementById('drag-merch-image-upload');
		if (uploadInput) uploadInput.value = '';
	}

	/**
	 * Renderiza la lista de Drag Merch según la drag seleccionada
	 */
	function renderDragMerchList() {
		if (!dragMerchListContainer || !appState) return;
		clearDynamicListListeners('dragMerchList');
		dragMerchListContainer.innerHTML = '';

		if (currentSelectedDragForMerch === null) {
			dragMerchListContainer.innerHTML = '<li class="text-gray-400 text-center font-pixel">Selecciona una drag para ver/añadir merch.</li>';
			if (dragMerchForm) dragMerchForm.classList.add('hidden');
			if (dragMerchSalesSummary) dragMerchSalesSummary.classList.add('hidden');
			return;
		}

		// Mostrar formulario y resumen cuando hay drag seleccionada
		if (dragMerchSalesSummary) dragMerchSalesSummary.classList.remove('hidden');

		const drag = appState.drags.find(d => d.id === currentSelectedDragForMerch);
		if (!drag) {
			dragMerchListContainer.innerHTML = '<li class="text-gray-400 text-center font-pixel">Drag no encontrada.</li>';
			return;
		}

		const merchItems = drag.merchItems || [];

		if (merchItems.length === 0) {
			dragMerchListContainer.innerHTML = '<li class="text-gray-400 text-center font-pixel">No hay artículos de merch para esta drag.</li>';
			return;
		}

		merchItems.forEach(item => {
			try {
				const li = document.createElement('li');
				li.className = "bg-gray-800 p-4 border border-gray-500 flex flex-wrap justify-between items-center gap-4";
				const itemImageUrl = item.imageUrl || 'https://placehold.co/60x60/333/ccc?text=?&font=vt323';
				const price = (item.price || 0).toFixed(2);

				li.innerHTML = `
					<div class="flex items-center gap-4 flex-grow min-w-0">
						<img src="${itemImageUrl}" alt="${item.name || 'Artículo'}" class="w-12 h-12 object-contain border border-gray-600 flex-shrink-0" onerror="this.onerror=null;this.src='https://placehold.co/60x60/333/ccc?text=ERR&font=vt323';">
						<div class="min-w-0">
							<span class="font-pixel text-lg text-white block truncate" title="${item.name || ''}">${item.name || 'Artículo sin nombre'}</span>
							<span class="text-base text-blue-400 font-bold">${price}€</span>
						</div>
					</div>
					<div class="flex space-x-2 flex-shrink-0">
						<button data-drag-merch-id="${item.id}" class="edit-drag-merch-btn bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-none text-sm font-pixel">EDITAR</button>
						<button data-drag-merch-id="${item.id}" class="delete-drag-merch-btn bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-none text-sm font-pixel">ELIMINAR</button>
					</div>
				`;
				dragMerchListContainer.appendChild(li);
			} catch (e) {
				console.error(`Error renderizando Drag Merch item ${item?.id}:`, e);
			}
		});

		// Añadir listeners
		dragMerchListContainer.querySelectorAll('.edit-drag-merch-btn').forEach(btn => addTrackedListener(btn, 'click', handleEditDragMerch));
		dragMerchListContainer.querySelectorAll('.delete-drag-merch-btn').forEach(btn => addTrackedListener(btn, 'click', handleDeleteDragMerch));
	}

	/**
	 * Maneja el guardado de Drag Merch (crear o editar)
	 */
	async function handleSaveDragMerch(e) {
		e.preventDefault();
		if (!dragMerchForm || !appState || currentSelectedDragForMerch === null) return;

		const dragIndex = appState.drags.findIndex(d => d.id === currentSelectedDragForMerch);
		if (dragIndex === -1) {
			showInfoModal("Error: Drag no encontrada.", true);
			return;
		}

		const formData = new FormData(dragMerchForm);
		const itemName = formData.get('drag-merch-name')?.trim() || '';
		const itemPrice = parseFloat(formData.get('drag-merch-price'));
		const itemImageUrl = formData.get('drag-merch-image-url')?.trim() || '';

		// Validaciones
		if (!itemName) {
			showInfoModal("El nombre del artículo es obligatorio.", true);
			return;
		}
		if (isNaN(itemPrice) || itemPrice < 0) {
			showInfoModal("El precio debe ser un número válido (0 o mayor).", true);
			return;
		}

		showLoading(true);
		try {
			if (!appState.drags[dragIndex].merchItems) {
				appState.drags[dragIndex].merchItems = [];
			}

			const merchItems = appState.drags[dragIndex].merchItems;

			if (editingDragMerchId !== null) {
				// Actualizar item existente
				const itemIndex = merchItems.findIndex(item => item.id === editingDragMerchId);
				if (itemIndex > -1) {
					merchItems[itemIndex] = {
						...merchItems[itemIndex],
						name: itemName,
						price: itemPrice,
						imageUrl: itemImageUrl
					};
					await saveAppState();
					showInfoModal(`¡Artículo de ${appState.drags[dragIndex].name} actualizado!`, false);
				} else {
					throw new Error("Artículo a editar no encontrado.");
				}
			} else {
				// Añadir nuevo item
				const newItem = {
					id: appState.nextMerchItemId++,
					name: itemName,
					price: itemPrice,
					imageUrl: itemImageUrl
				};
				merchItems.push(newItem);
				await saveAppState();
				showInfoModal(`¡Artículo añadido a ${appState.drags[dragIndex].name}!`, false);
			}

			hideDragMerchForm();
			renderDragMerchList();
			renderDragMerchSalesSummary();
			renderDragList(); // Actualizar contador
			renderMerchPage(); // Re-renderizar página pública
		} catch (error) {
			console.error("Error saving Drag Merch item:", error);
			showInfoModal("Error al guardar el artículo: " + error.message, true);
		} finally {
			showLoading(false);
		}
	}

	/**
	 * Maneja la edición de un artículo de Drag Merch
	 */
	function handleEditDragMerch(e) {
		if (!appState || !dragMerchForm || currentSelectedDragForMerch === null) return;
		const merchId = parseInt(e.currentTarget.dataset.dragMerchId, 10);
		if (isNaN(merchId)) return;

		const drag = appState.drags.find(d => d.id === currentSelectedDragForMerch);
		const itemToEdit = drag?.merchItems?.find(item => item.id === merchId);

		if (!itemToEdit) {
			showInfoModal("Error: Artículo no encontrado para editar.", true);
			return;
		}

		// Rellenar formulario
		const editIdInput = document.getElementById('edit-drag-merch-id');
		if (editIdInput) editIdInput.value = itemToEdit.id;

		const nameInput = document.getElementById('drag-merch-name');
		if (nameInput) nameInput.value = itemToEdit.name || '';

		const priceInput = document.getElementById('drag-merch-price');
		if (priceInput) priceInput.value = itemToEdit.price || 0;

		if (dragMerchImageUrlInput) dragMerchImageUrlInput.value = itemToEdit.imageUrl || '';

		editingDragMerchId = itemToEdit.id;
		dragMerchForm.classList.remove('hidden');
		dragMerchForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	/**
	 * Maneja la eliminación de un artículo de Drag Merch
	 */
	async function handleDeleteDragMerch(e) {
		if (!appState || currentSelectedDragForMerch === null) return;
		const merchId = parseInt(e.currentTarget.dataset.dragMerchId, 10);
		if (isNaN(merchId)) return;

		const dragIndex = appState.drags.findIndex(d => d.id === currentSelectedDragForMerch);
		if (dragIndex === -1) return;

		const merchItems = appState.drags[dragIndex].merchItems || [];
		const itemIndex = merchItems.findIndex(item => item.id === merchId);

		if (itemIndex === -1) {
			showInfoModal("Error: Artículo no encontrado.", true);
			return;
		}

		const itemName = merchItems[itemIndex].name || 'este artículo';

		console.warn(`Simulando confirmación para eliminar Drag Merch: ${itemName} (ID: ${merchId})`);
		showLoading(true);
		try {
			merchItems.splice(itemIndex, 1);

			if (editingDragMerchId === merchId) {
				resetDragMerchForm();
			}

			await saveAppState();
			showLoading(false);
			showInfoModal(`Artículo "${itemName}" eliminado.`, false);

			renderDragMerchList();
			renderDragMerchSalesSummary();
			renderDragList();
			renderMerchPage();
		} catch (error) {
			showLoading(false);
			console.error("Error deleting Drag Merch item:", error);
			showInfoModal("Error al eliminar el artículo: " + error.message, true);
		}
	}

	/**
	 * Renderiza el resumen de ventas de Drag Merch
	 */
	function renderDragMerchSalesSummary() {
		if (!dragMerchSalesSummary || !dragMerchTotalItems || !dragMerchTotalRevenue || !dragMerchViewSalesBtn || currentSelectedDragForMerch === null) return;

		const salesForDrag = (allMerchSales || []).filter(s => parseInt(s.dragId) === parseInt(currentSelectedDragForMerch));
		const deliveredSales = salesForDrag.filter(s => s.status === 'Delivered');
		const pendingSalesCount = salesForDrag.length - deliveredSales.length;

		// MODIFICADO: Incluir ventas Pendientes en los totales para que la Drag vea que hay movimiento
		// Se puede separar si se prefiere: "Entregado: X, Pendiente: Y", pero el usuario pide ver ventas
		const totalSales = salesForDrag;
		let totalItems = 0;
		let totalRevenue = 0;

		totalSales.forEach(sale => {
			totalItems += sale.quantity || 0;
			totalRevenue += (sale.quantity || 0) * (sale.itemPrice || 0);
		});

		dragMerchTotalItems.textContent = totalItems.toString(); // + (pendingSalesCount > 0 ? ` (${pendingSalesCount} pend.)` : '');
		dragMerchTotalRevenue.textContent = totalRevenue.toFixed(2) + ' €';

		if (salesForDrag.length > 0) {
			dragMerchViewSalesBtn.textContent = `VER LISTA PEDIDOS (${pendingSalesCount} PENDIENTES)`;
			dragMerchViewSalesBtn.disabled = false;
		} else {
			dragMerchViewSalesBtn.textContent = `NO HAY PEDIDOS REGISTRADOS`;
			dragMerchViewSalesBtn.disabled = true;
		}
	}

	/**
	 * Muestra el modal con la lista de ventas de Drag Merch
	 */
	function handleViewDragMerchSales() {
		if (!merchSalesListModal || !merchSalesListTitle || !merchSalesListContent || currentSelectedDragForMerch === null || !appState) return;

		const drag = appState.drags.find(d => d.id === currentSelectedDragForMerch);
		if (!drag) {
			showInfoModal("Error: Drag no encontrada.", true);
			return;
		}

		merchSalesListTitle.textContent = `Pedidos de Merch: ${drag.name || 'Drag'}`;
		renderMerchSalesListForDrag(currentSelectedDragForMerch);
		merchSalesListModal.classList.remove('hidden');
	}

	// ========== FIN NUEVO SISTEMA DUAL DE MERCH ==========

	// ========== SMTP CONFIGURATION FUNCTIONS ==========

	/**
	 * Renderiza el formulario de configuración SMTP con los valores actuales
	 */
	async function renderSMTPConfig() {
		if (!smtpConfigForm) return;

		showLoading(true);
		try {
			const response = await fetch('get_smtp_config.php');
			const data = await response.json();

			if (data.success && data.config) {
				const config = data.config;
				if (document.getElementById('smtp-host')) document.getElementById('smtp-host').value = config.host || '';
				if (document.getElementById('smtp-port')) document.getElementById('smtp-port').value = config.port || '';
				if (document.getElementById('smtp-username')) document.getElementById('smtp-username').value = config.username || '';
				// Password security: don't fill it
				if (document.getElementById('smtp-encryption')) document.getElementById('smtp-encryption').value = config.encryption || 'tls';
				if (document.getElementById('smtp-from-email')) document.getElementById('smtp-from-email').value = config.from_email || '';
				if (document.getElementById('smtp-from-name')) document.getElementById('smtp-from-name').value = config.from_name || '';
				if (document.getElementById('smtp-enabled')) document.getElementById('smtp-enabled').checked = !!config.enabled;
			}
		} catch (error) {
			console.error("Error loading SMTP config:", error);
			showInfoModal("Error al cargar configuración SMTP", true);
		} finally {
			showLoading(false);
		}
	}

	/**
	 * Renderiza/Carga la configuración SMTP del servidor
	 */
	async function renderSMTPConfig() {
		// Log para debug
		console.log("Rendering SMTP Config...");
		if (!smtpConfigForm) {
			console.error("SMTP Config Form not found in DOM");
			return;
		}

		try {
			const response = await fetch(`get_smtp_config.php?t=${Date.now()}`);
			const result = await response.json();
			console.log("SMTP Config Loaded:", result);

			if (result.success && result.config) {
				const config = result.config;
				if (document.getElementById('smtp-host')) document.getElementById('smtp-host').value = config.host || '';
				if (document.getElementById('smtp-port')) document.getElementById('smtp-port').value = config.port || '';
				if (document.getElementById('smtp-username')) document.getElementById('smtp-username').value = config.username || '';
				// Password no se devuelve, dejar vacío
				if (document.getElementById('smtp-encryption')) document.getElementById('smtp-encryption').value = config.encryption || 'tls';
				if (document.getElementById('smtp-from-email')) document.getElementById('smtp-from-email').value = config.from_email || '';
				if (document.getElementById('smtp-from-name')) document.getElementById('smtp-from-name').value = config.from_name || '';
				if (document.getElementById('smtp-enabled')) document.getElementById('smtp-enabled').checked = !!config.enabled;
			}
		} catch (error) {
			console.error("Error loading SMTP config:", error);
		}
	}

	/**
	 * Maneja el guardado de la configuración SMTP
	 */
	async function handleSaveSMTPConfig(e) {
		e.preventDefault();
		if (!smtpConfigForm) return;

		const formData = new FormData(smtpConfigForm);
		const config = {
			host: formData.get('smtp-host'),
			port: parseInt(formData.get('smtp-port')),
			username: formData.get('smtp-username'),
			password: formData.get('smtp-password'),
			encryption: formData.get('smtp-encryption'),
			from_email: formData.get('smtp-from-email'),
			from_name: formData.get('smtp-from-name'),
			enabled: formData.get('smtp-enabled') === 'on'
		};

		// Validaciones básicas
		if (!config.host || !config.port || !config.username || !config.encryption) {
			showInfoModal("Por favor rellena todos los campos obligatorios (*)", true);
			return;
		}

		// Si el password está vacío, no lo enviamos (asumimos que no cambió)
		// Pero para la primera vez es obligatorio. El backend lo validará si falta lo requerido.
		if (!config.password) {
			// Si es edición y ya existe, el backend podría manejarlo, pero aquí lo enviamos tal cual
			// El PHP requerirá password si es archivo nuevo.
		}

		showLoading(true);
		try {
			const response = await fetch('save_smtp_config.php', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(config)
			});
			const result = await response.json();

			if (result.success) {
				showInfoModal("Configuración SMTP guardada correctamente", false);
			} else {
				throw new Error(result.message || "Error desconocido");
			}
		} catch (error) {
			console.error("Error saving SMTP config:", error);
			showInfoModal("Error al guardar: " + error.message, true);
		} finally {
			showLoading(false);
		}
	}

	/**
	 * Prueba la conexión SMTP
	 */
	async function testSMTPConnection() {
		const username = document.getElementById('smtp-username').value;
		if (!username) {
			showInfoModal("Guarda primero la configuración o introduce un usuario válido.", true);
			return;
		}

		if (!confirm(`Se enviará un email de prueba a ${username}. ¿Continuar?`)) return;

		showLoading(true);
		try {
			// Usamos send_email.php (que ya recibe to, subject, body) o creamos uno simple de test.
			// Reutilizamos el endpoint existente o creamos uno ad-hoc?
			// Como send_email.php es una librería, no un endpoint directo (es require_once),
			// necesitamos un endpoint para testear.
			// Por simplicidad, podemos llamar a una función backend específica o...
			// ERROR: send_email.php no es un endpoint ejecutable directamente vía fetch si solo define funciones.
			// Crearemos un archivo PHP temporal o usaremos un truco.
			// O mejor: send_email.php debería tener modo de ejecución si se llama directamente? No, es librería.
			// Solución: Crear un endpoint test_smtp.php rápido ahora.
			const response = await fetch('test_smtp.php', { // Asumiendo que lo creamos
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: username })
			});
			// Nota: Debemos crear test_smtp.php

			const result = await response.json();
			if (result.success) {
				showInfoModal("✅ ¡Conexión Exitosa! Email enviado.", false);
			} else {
				showInfoModal("❌ Error de conexión: " + result.message, true);
			}

		} catch (error) {
			showInfoModal("Error al probar conexión: No se pudo contactar con servidor de prueba", true);
		} finally {
			showLoading(false);
		}
	}

	/**
	 * Renderiza la configuración de notificaciones (Web Merch y Drags)
	 */
	function renderEmailNotifications() {
		if (!appState) return;

		// Cargar configuración de Web Merch
		const emailNotifs = appState.emailNotifications || {};
		const webMerchConfig = emailNotifs.webMerch || {};

		if (webMerchNotifEmail) webMerchNotifEmail.value = webMerchConfig.notificationEmail || '';
		if (webMerchBuyerTemplate) webMerchBuyerTemplate.value = webMerchConfig.buyerTemplate || '';

		// Cargar select de drags
		if (dragEmailSelect && appState.drags) {
			const currentVal = dragEmailSelect.value;
			dragEmailSelect.innerHTML = '<option value="">-- SELECCIONA UNA DRAG --</option>';
			appState.drags.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(drag => {
				const option = document.createElement('option');
				option.value = drag.id;
				option.textContent = drag.name;
				dragEmailSelect.appendChild(option);
			});
			if (currentVal) dragEmailSelect.value = currentVal;
		}
	}

	/**
	 * Maneja la selección de drag para configurar email
	 */
	function handleDragEmailSelect(e) {
		const dragId = parseInt(e.target.value);
		if (!dragId || isNaN(dragId)) {
			if (dragEmailConfigForm) dragEmailConfigForm.classList.add('hidden');
			return;
		}

		if (dragEmailConfigForm) dragEmailConfigForm.classList.remove('hidden');

		// Buscar config actual
		const emailNotifs = appState.emailNotifications || {};
		const dragsConfig = emailNotifs.drags || [];
		const currentConfig = dragsConfig.find(c => c.dragId === dragId) || {};

		if (dragNotifEmail) dragNotifEmail.value = currentConfig.notificationEmail || '';
		if (dragBuyerTemplate) dragBuyerTemplate.value = currentConfig.buyerTemplate || '';
	}

	/**
	 * Guarda la configuración de email de la drag seleccionada
	 */
	async function handleSaveDragEmailConfig() {
		if (!dragEmailSelect || !appState) return;
		const dragId = parseInt(dragEmailSelect.value);
		if (!dragId) return;

		if (!appState.emailNotifications) appState.emailNotifications = {};
		if (!appState.emailNotifications.drags) appState.emailNotifications.drags = [];

		const notifEmail = dragNotifEmail ? dragNotifEmail.value : '';
		const buyerMsg = dragBuyerTemplate ? dragBuyerTemplate.value : '';

		// Actualizar array
		const existingIndex = appState.emailNotifications.drags.findIndex(c => c.dragId === dragId);
		const newConfig = { dragId, notificationEmail: notifEmail, buyerTemplate: buyerMsg };

		if (existingIndex > -1) {
			appState.emailNotifications.drags[existingIndex] = newConfig;
		} else {
			appState.emailNotifications.drags.push(newConfig);
		}

		await saveAppState(); // Persistir en servidor (app_state.json)
		showInfoModal("Configuración de notificaciones de drag guardada.", false);
	}

	/**
	 * Guarda estado general de notificaciones (para Web Merch)
	 */
	/**
	 * Guarda estado general de notificaciones (para Web Merch)
	 */
	async function saveEmailNotificationsState() {
		if (!appState) return;
		if (!appState.emailNotifications) appState.emailNotifications = {};

		appState.emailNotifications.webMerch = {
			notificationEmail: webMerchNotifEmail ? webMerchNotifEmail.value : '',
			buyerTemplate: webMerchBuyerTemplate ? webMerchBuyerTemplate.value : ''
		};

		await saveAppState(); // Persistir en servidor (datos_app.json)
		showInfoModal("Configuración Web Merch guardada.", false);
	}

	// ========== FIN SMTP CONFIGURATION ==========


	// --- FIN ---
	// (renderAdminEvents, handleViewTickets, etc. empiezan en la siguiente parte)
	/**
	 * Renderiza la lista de eventos en el panel de administración.
	 */
	/**
	 * Renderiza la lista de eventos en el panel de administración.
	 * MODIFICADO: Ahora calcula el total de entradas vendidas (totalQuantitySold)
	 * directamente desde 'allTickets' para asegurar precisión y evitar discrepancias.
	 */
	function renderAdminEvents(events) {
		clearDynamicListListeners('adminEvents');
		if (!adminEventListUl) return;
		adminEventListUl.innerHTML = ''; // Limpiar

		if (!Array.isArray(events)) {
			adminEventListUl.innerHTML = '<li class="text-red-400 text-center font-pixel">Error cargando eventos.</li>';
			return;
		}
		if (events.length === 0) {
			adminEventListUl.innerHTML = '<li class="text-gray-400 text-center font-pixel">NO HAY EVENTOS CREADOS.</li>';
			return;
		}

		// Ordenar: No archivados primero, luego por fecha descendente
		[...events].sort((a, b) => {
			if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
			return (b.date && a.date) ? new Date(b.date) - new Date(a.date) : 0;
		}).forEach(event => {
			try {
				const isArchived = event.isArchived || false;
				const eventDate = event.date ? new Date(event.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha N/A';
				const capacity = event.ticketCapacity || 0;

				// --- MODIFICACIÓN CLAVE ---
				// Calcular contadores SIEMPRE desde allTickets (la fuente real)
				const ticketsForEvent = allTickets.filter(t => t.eventId === event.id);
				const purchasedTicketsCount = ticketsForEvent.length; // Número de registros de compra
				const totalQuantitySold = ticketsForEvent.reduce((sum, t) => sum + (t.quantity || 0), 0); // Suma real de cantidades
				// --- FIN MODIFICACIÓN ---

				// Usar el 'totalQuantitySold' real para la barra de capacidad
				let barWidthPercent = capacity > 0 ? Math.min((totalQuantitySold / capacity) * 100, 100) : 0;
				const capacityText = capacity > 0 ? capacity : 'Ilimitado';

				// Ya no necesitamos la comprobación de discrepancia aquí,
				// porque 'totalQuantitySold' es el valor correcto.
				// Y 'event.ticketsSold' fue corregido en memoria por syncTicketCounters().


				const item = document.createElement('li');
				item.className = `bg-gray-800 p-4 border ${isArchived ? 'border-gray-700' : 'border-gray-500'} ${isArchived ? 'opacity-60' : ''}`;
				item.innerHTML = `
						<div class="flex flex-wrap justify-between items-center mb-3 gap-y-2">
							<div class="flex-grow min-w-0 mr-4">
								<span class="font-pixel text-xl ${isArchived ? 'text-gray-500 line-through' : 'text-white'}">${event.name || 'Evento sin nombre'}</span>
								<span class="text-sm ${isArchived ? 'text-gray-500' : 'text-gray-400'} ml-2 block sm:inline">(${eventDate})</span>
							</div>
							<div class="flex-shrink-0 flex items-center flex-wrap gap-2">
								<span class="text-lg text-blue-400 font-bold">${(event.price || 0).toFixed(2)}€</span>
								<!-- Usar totalQuantitySold para el botón -->
								<button data-event-id="${event.id}" class="view-tickets-btn bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-none text-sm font-pixel ${purchasedTicketsCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${purchasedTicketsCount === 0 ? 'disabled' : ''}>LISTA (${totalQuantitySold})</button>
								${!isArchived ? `<button data-event-id="${event.id}" class="edit-event-btn bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-none text-sm font-pixel">EDITAR</button>` : ''}
								<button data-event-id="${event.id}" class="archive-event-btn ${isArchived ? 'bg-gray-500 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-500'} text-white px-3 py-1 rounded-none text-sm font-pixel" ${isArchived ? 'disabled' : ''}>
									${isArchived ? 'ARCHIVADO' : 'ARCHIVAR'}
								</button>
								<button data-event-id="${event.id}" class="delete-event-btn bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-none text-sm font-pixel">ELIMINAR</button>
							</div>
						</div>
						<div class="mt-2">
							<div class="flex justify-between items-center text-sm font-pixel ${isArchived ? 'text-gray-500' : 'text-gray-300'} mb-1">
								<span>ENTRADAS VENDIDAS (TOTAL)</span>
								<!-- Usar totalQuantitySold para la barra -->
								<span>[${totalQuantitySold} / ${capacityText}]</span>
							</div>
							<div class="w-full bg-gray-600 rounded-none h-4 border border-gray-400 overflow-hidden">
								<div class="bg-green-500 h-full rounded-none transition-all duration-300" style="width: ${barWidthPercent}%;"></div>
							</div>
							<div class="text-sm ${isArchived ? 'text-gray-500' : 'text-gray-300'} mt-1">
								<!-- Usar purchasedTicketsCount para los registros -->
								Registros de compra: <strong>${purchasedTicketsCount}</strong>
							</div>
						</div>`;
				adminEventListUl.appendChild(item);
			} catch (e) {
				console.error(`Error renderizando evento admin ${event?.id}:`, e);
			}
		});

		// Re-adjuntar listeners
		adminEventListUl.querySelectorAll('.archive-event-btn:not([disabled])').forEach(btn => addTrackedListener(btn, 'click', handleArchiveEvent));
		adminEventListUl.querySelectorAll('.edit-event-btn').forEach(btn => addTrackedListener(btn, 'click', handleEditEventClick));
		adminEventListUl.querySelectorAll('.delete-event-btn').forEach(btn => addTrackedListener(btn, 'click', handleDeleteEvent));
		adminEventListUl.querySelectorAll('.view-tickets-btn:not([disabled])').forEach(btn => addTrackedListener(btn, 'click', handleViewTickets));
	}


	/**
	 * Muestra la lista de emails/tickets comprados para un evento.
	 * MODIFICADO: Añade botón ELIMINAR a cada entrada.
	 */
	function handleViewTickets(e) {
		const eventId = parseInt(e.target.dataset.eventId, 10);
		if (isNaN(eventId) || !appState || !appState.events || !allTickets) return;

		const event = appState.events.find(ev => ev.id === eventId);
		if (!event) {
			showInfoModal("Error: Evento no encontrado.", true); return;
		}
		if (!ticketListModal || !ticketListTitle || !ticketListContent) {
			showInfoModal("Error interno: Elementos del modal no encontrados.", true); return;
		}

		clearDynamicListListeners('ticketListItems'); // Limpiar listeners antiguos de delete
		const ticketsForEvent = allTickets.filter(t => t.eventId === event.id);
		let listHtml = '';

		if (ticketsForEvent.length === 0) {
			listHtml = '<p class="text-gray-400 text-center font-pixel">NO HAY ENTRADAS REGISTRADAS PARA ESTE EVENTO.</p>';
		} else {
			// Ordenar por email
			ticketsForEvent.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
			const totalQuantity = ticketsForEvent.reduce((sum, t) => sum + (t.quantity || 0), 0);
			listHtml = `<p class="text-gray-400 text-sm font-pixel mb-4">${ticketsForEvent.length} COMPRA(S) | ${totalQuantity} ENTRADA(S) TOTAL</p>
							<ul class="text-left space-y-3">`;
			ticketsForEvent.forEach(ticket => {
				const ticketIdShort = (ticket.ticketId || 'N/A').substring(0, 13);
				// NUEVO: Nombre y apellidos
				const holderName = `${ticket.nombre || ''} ${ticket.apellidos || ''}`.trim();

				listHtml += `
						<li class="p-3 bg-gray-800 border border-gray-600 flex flex-col sm:flex-row justify-between items-start gap-2">
							<div class="min-w-0 flex-grow">
								<strong class="text-white text-base font-pixel">${holderName || 'Nombre N/A'}</strong><br>
								<span class="text-sm text-gray-400 break-all">${ticket.email || 'Email no disponible'}</span><br>
								<span class="text-gray-400">CANTIDAD: ${ticket.quantity || '?'}</span><br>
								<span class="text-gray-500 text-xs">ID: ${ticketIdShort}...</span>
							</div>
							<div class="flex-shrink-0 mt-1 sm:mt-0">
								<!-- NUEVO: Botón Eliminar -->
								<button data-ticket-id="${ticket.ticketId}" class="delete-ticket-btn bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-none text-sm font-pixel">ELIMINAR</button>
							</div>
						</li>`;
			});
			listHtml += '</ul>';
		}

		ticketListTitle.textContent = `Entradas: ${event.name || 'Evento'}`;
		ticketListContent.innerHTML = listHtml;

		// NUEVO: Añadir listeners a los botones de eliminar
		ticketListContent.querySelectorAll('.delete-ticket-btn').forEach(btn => {
			addTrackedListener(btn, 'click', handleDeleteTicket);
		});

		ticketListModal.classList.remove('hidden');
	}

	/**
	 * NUEVO: Elimina una entrada específica (simulación de confirmación).
	 */
	async function handleDeleteTicket(e) {
		const ticketId = e.target.dataset.ticketId;
		if (!ticketId || !allTickets || !appState || !appState.events) return;

		const ticketIndex = allTickets.findIndex(t => t.ticketId === ticketId);
		if (ticketIndex === -1) {
			showInfoModal("Error: Entrada no encontrada para eliminar.", true); return;
		}

		const ticketToDelete = allTickets[ticketIndex];
		const eventId = ticketToDelete.eventId;
		const quantityToDelete = ticketToDelete.quantity || 0;
		const email = ticketToDelete.email || 'esta entrada';

		// Simulación de confirmación
		console.warn(`Simulando confirmación para eliminar ticket: ${email} (ID: ${ticketId})`);
		showLoading(true);
		try {
			// Eliminar ticket de allTickets
			allTickets.splice(ticketIndex, 1);

			// Actualizar contador ticketsSold en appState.events
			const eventIndex = appState.events.findIndex(ev => ev.id === eventId);
			if (eventIndex > -1) {
				// Asegurar que el contador existe y restar cantidad
				if (typeof appState.events[eventIndex].ticketsSold === 'number') {
					appState.events[eventIndex].ticketsSold = Math.max(0, appState.events[eventIndex].ticketsSold - quantityToDelete); // Evitar negativos
				} else {
					appState.events[eventIndex].ticketsSold = 0; // Si no existía, poner a 0
				}
				currentEvents = [...appState.events]; // Actualizar copia local
			} else {
				console.warn(`Evento ${eventId} no encontrado al intentar actualizar contador tras borrar ticket ${ticketId}.`);
			}

			// Guardar AMBOS estados
			await Promise.all([
				saveAppState(),
				saveTicketState()
			]);

			showLoading(false);
			showInfoModal(`ENTRADA DE ${email} ELIMINADA.`, false);

			// Re-renderizar lista de tickets en el modal si sigue abierto
			if (ticketListModal && !ticketListModal.classList.contains('hidden') && ticketListTitle) {
				// Reconstruir título para obtener ID del evento actual
				const titleText = ticketListTitle.textContent || '';
				const currentEventInModal = appState.events.find(ev => titleText.includes(ev.name || `Evento ${ev.id}`)); // Intenta encontrar evento por nombre en título
				if (currentEventInModal && currentEventInModal.id === eventId) {
					// Si el modal abierto es del evento afectado, recargar su contenido
					handleViewTickets({ target: { dataset: { eventId: eventId.toString() } } }); // Simular click en "Ver Lista"
				} else {
					// Si no se puede determinar o es de otro evento, cerrar modal por seguridad
					closeModal('ticket-list-modal');
				}
			}
			// Re-renderizar lista de eventos admin (para actualizar contador)
			renderAdminEvents(currentEvents);
			// Re-renderizar lista pública/home (para actualizar contador visual si afecta botón AGOTADO)
			renderPublicEvents(currentEvents);
			renderHomeEvents(currentEvents);
			// Re-renderizar sorteo
			renderGiveawayEvents(currentEvents);

		} catch (error) {
			showLoading(false);
			console.error("Error deleting ticket:", error);
			// Revertir cambios en memoria? Complicado. Mostrar error.
			showInfoModal("Error al eliminar la entrada: " + error.message, true);
		}
	}


	/**
	 * Rellena el formulario de evento para editar uno existente.
	 */
	function handleEditEventClick(e) {
		const eventId = parseInt(e.target.dataset.eventId, 10);
		if (isNaN(eventId) || !appState || !appState.events) return;

		const eventToEdit = appState.events.find(ev => ev.id === eventId);
		if (!eventToEdit || !addEventForm) {
			showInfoModal("Error: Evento no encontrado para editar.", true); return;
		}

		// Rellenar formulario
		addEventForm['edit-event-id'].value = eventToEdit.id;
		addEventForm['event-name'].value = eventToEdit.name || '';
		// Formatear fecha para input datetime-local (YYYY-MM-DDTHH:mm)
		try {
			const dateForInput = eventToEdit.date ? new Date(eventToEdit.date).toISOString().slice(0, 16) : '';
			addEventForm['event-date'].value = dateForInput;
		} catch (dateError) {
			console.error("Fecha inválida para evento:", eventToEdit.id, eventToEdit.date, dateError);
			addEventForm['event-date'].value = ''; // Dejar vacío si inválida
		}
		addEventForm['event-price'].value = eventToEdit.price || 0;
		addEventForm['event-capacity'].value = eventToEdit.ticketCapacity || 0;
		addEventForm['event-description'].value = eventToEdit.description || '';
		addEventForm['event-poster-url'].value = eventToEdit.posterImageUrl || '';
		// No limpiar input file al editar, podría querer mantener la imagen subida

		editingEventId = eventToEdit.id; // Marcar como editando

		// Cambiar botón
		if (addEventFormButton) {
			addEventFormButton.textContent = "ACTUALIZAR EVENTO";
			addEventFormButton.classList.remove('bg-white', 'hover:bg-gray-300');
			addEventFormButton.classList.add('bg-blue-600', 'hover:bg-blue-500'); // Estilo editar
		}
		addEventForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	/**
	 * Resetea el formulario de añadir/editar evento.
	 */
	function resetEventForm() {
		if (!addEventForm) return;
		addEventForm.reset();
		editingEventId = null; // No estamos editando
		addEventForm['edit-event-id'].value = ''; // Limpiar ID oculto
		if (eventPosterUploadInput) eventPosterUploadInput.value = ''; // Limpiar input file

		// Restaurar botón
		if (addEventFormButton) {
			addEventFormButton.textContent = "GUARDAR EVENTO";
			addEventFormButton.classList.remove('bg-blue-600', 'hover:bg-blue-500');
			addEventFormButton.classList.add('bg-white', 'hover:bg-gray-300'); // Estilo por defecto
		}
	}

	/**
	 * Renderiza la lista de eventos con tickets para el sorteo.
	 */
	function renderGiveawayEvents(events) {
		clearDynamicListListeners('giveaway');
		if (!giveawayEventListUl || !giveawayWinnerResult || !allTickets) return;

		giveawayEventListUl.innerHTML = ''; // Limpiar
		// Resetear resultado si no hay evento seleccionado
		giveawayWinnerResult.innerHTML = `<p class="text-gray-500 font-pixel">SELECCIONA UN EVENTO Y PULSA "INDICAR GANADOR"</p>`;

		if (!Array.isArray(events)) {
			giveawayEventListUl.innerHTML = '<li class="text-red-400 text-center font-pixel">Error cargando eventos para sorteo.</li>';
			return;
		}

		// Filtrar eventos que tengan al menos una entrada vendida
		const eventsWithTickets = events.filter(e => e && allTickets.some(t => t.eventId === e.id));

		if (eventsWithTickets.length === 0) {
			giveawayEventListUl.innerHTML = '<li class="text-gray-400 text-center font-pixel">NINGÚN EVENTO TIENE ENTRADAS VENDIDAS PARA SORTEAR.</li>';
			return;
		}

		// Ordenar por fecha descendente
		eventsWithTickets.sort((a, b) => (b.date && a.date) ? new Date(b.date) - new Date(a.date) : 0);

		eventsWithTickets.forEach(event => {
			try {
				// Contar registros de tickets para este evento
				const purchasedTicketsCount = allTickets.filter(t => t.eventId === event.id).length;
				const eventDateStr = event.date ? new Date(event.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Fecha N/A';

				const item = document.createElement('li');
				item.className = "flex flex-wrap justify-between items-center bg-gray-800 p-4 border border-gray-500 gap-4";
				item.innerHTML = `
						<div class="min-w-0 mr-4">
							<span class="font-pixel text-xl text-white block truncate">${event.name || 'Evento'} <span class="text-sm text-gray-400">(${eventDateStr})</span></span>
							<span class="text-sm text-gray-400 block sm:inline">(${purchasedTicketsCount} ${purchasedTicketsCount === 1 ? 'compra' : 'compras'})</span>
						</div>
						<button data-event-id="${event.id}" class="giveaway-btn flex-shrink-0 bg-white text-black font-pixel text-lg px-4 py-2 rounded-none border border-gray-400 hover:bg-gray-300">
							INDICAR GANADOR
						</button>`;
				giveawayEventListUl.appendChild(item);
			} catch (e) {
				console.error(`Error renderizando evento ${event?.id} para sorteo:`, e);
			}
		});

		// Re-adjuntar listeners
		giveawayEventListUl.querySelectorAll('.giveaway-btn').forEach(btn => addTrackedListener(btn, 'click', handleGiveawayClick));
	}


	/**
	 * Realiza el sorteo para un evento seleccionado.
	 * MODIFICADO: Ahora sortea sobre registros de tickets, no emails únicos.
	 */
	function handleGiveawayClick(e) {
		const eventId = parseInt(e.target.dataset.eventId, 10);
		if (isNaN(eventId) || !appState || !appState.events || !allTickets || !giveawayWinnerResult) return;

		const event = appState.events.find(ev => ev.id === eventId);
		if (!event) {
			showInfoModal("Error: Evento no encontrado para sortear.", true); return;
		}

		// Obtener TODOS los registros de tickets para este evento
		const ticketsForEvent = allTickets.filter(t => t.eventId === eventId);

		if (ticketsForEvent.length === 0) {
			giveawayWinnerResult.innerHTML = `<p class="text-yellow-400 font-pixel text-2xl">Este evento no tiene entradas para sortear.</p>`;
			return;
		}

		showLoading(true);
		// Simular pequeña espera para efecto
		setTimeout(() => {
			// Elegir un registro de ticket aleatorio
			const randomIndex = Math.floor(Math.random() * ticketsForEvent.length);
			const winningTicket = ticketsForEvent[randomIndex];

			const winningEmail = winningTicket.email || 'N/A';
			const ticketIdShort = (winningTicket.ticketId || 'N/A').substring(0, 13);
			const quantity = winningTicket.quantity || '?';
			// NUEVO: Nombre y apellidos
			const winnerName = `${winningTicket.nombre || ''} ${winningTicket.apellidos || ''}`.trim() || 'Nombre N/A';

			showLoading(false);
			giveawayWinnerResult.innerHTML = `
					<p class="text-gray-300 font-pixel text-xl sm:text-2xl mb-2">EL GANADOR PARA</p>
					<h4 class="text-3xl sm:text-4xl font-pixel text-white text-glow-white mb-4 break-words">${event.name || 'Evento'}</h4>
					<p class="text-gray-300 font-pixel text-xl sm:text-2xl mb-2">ES:</p>
					<!-- MODIFICADO: Mostrar nombre completo -->
					<p class="text-4xl sm:text-5xl font-pixel text-green-400 text-glow-white mb-2 break-all">${winnerName}</p>
					<p class="text-lg text-gray-400 font-pixel mb-4 break-all">(${winningEmail})</p>
					<p class="text-gray-400 font-pixel text-base sm:text-lg">(Ticket ID: ${ticketIdShort}... | Cantidad: ${quantity})</p>`;
		}, 300); // 300ms delay
	}

	/**
	 * Carga los datos actuales del appState en los formularios de admin (Contenido, Galerías).
	 */
	/**
	 * Carga los datos actuales del appState en los formularios de admin (Contenido, Galerías).
	 */
	/**
	 * Carga los datos actuales del appState en los formularios de admin (Contenido, Galerías).
	 */
	function loadContentToAdmin() {
		if (!appState) return; // Si appState no se cargó, no hacer nada

		// Sección Contenido
		if (appLogoUrlInput) appLogoUrlInput.value = appState.appLogoUrl || '';
		if (ticketLogoUrlInput) ticketLogoUrlInput.value = appState.ticketLogoUrl || '';
		if (bannerUrlInput) bannerUrlInput.value = appState.bannerVideoUrl || '';
		if (promoEnableCheckbox) promoEnableCheckbox.checked = appState.promoEnabled || false;
		if (promoTextInput) promoTextInput.value = appState.promoCustomText || '';
		if (promoNeonColorInput) promoNeonColorInput.value = appState.promoNeonColor || '#F02D7D';

		const domainsInput = document.getElementById('allowed-domains-input');
		if (domainsInput) {
			domainsInput.value = (appState.allowedDomains || []).join('\n');
		}

		// Sección Galerías
		if (galleryEventSelect) {
			const currentSelectedId = galleryEventSelect.value; // Guardar selección
			galleryEventSelect.innerHTML = '<option value="">-- SELECCIONA UN EVENTO --</option>'; // Limpiar

			// Limpiar rejilla y input oculto al recargar el select
			if (adminGalleryPreviewGrid) {
				adminGalleryPreviewGrid.innerHTML = `<p class="text-gray-500 font-pixel text-center col-span-full self-center">Selecciona un evento para ver/añadir imágenes.</p>`;
			}
			const hiddenGalleryInput = document.getElementById('gallery-urls-input');
			if (hiddenGalleryInput) hiddenGalleryInput.value = '';

			// Poblar select con eventos ordenados por fecha
			const sortedEvents = [...(appState.events || [])]
				.sort((a, b) => (b.date && a.date) ? new Date(b.date) - new Date(a.date) : 0);

			sortedEvents.forEach(event => {
				const option = document.createElement('option');
				option.value = event.id;
				const dateStr = event.date ? new Date(event.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Fecha N/A';
				option.textContent = `${event.name || `Evento ${event.id}`} (${dateStr})${event.isArchived ? ' (Archivado)' : ''}`;
				galleryEventSelect.appendChild(option);
			});

			// Restaurar selección si aún existe y renderizar su galería
			if (currentSelectedId && galleryEventSelect.querySelector(`option[value="${currentSelectedId}"]`)) {
				galleryEventSelect.value = currentSelectedId;
				handleGalleryEventSelect(); // Llama a renderAdminGalleryGrid internamente
			}
		}
	}


	/**
	 * Guarda los cambios de contenido general (logos, banner, promo, dominios).
	 */
	/**
	 * Guarda los cambios de contenido general (logos, banner, promo, dominios).
	 */
	async function handleSaveContent(e) {
		e.preventDefault();
		if (!contentManageForm || !appState) return;

		// Recoger valores de los inputs
		const newAppLogoUrl = appLogoUrlInput?.value.trim() || '';
		const newTicketLogoUrl = ticketLogoUrlInput?.value.trim() || '';
		const newBannerUrl = bannerUrlInput?.value.trim() || '';
		const newPromoEnabled = promoEnableCheckbox?.checked || false;
		const newPromoText = promoTextInput?.value.trim() || '';
		const newPromoNeonColor = promoNeonColorInput?.value.trim() || '#F02D7D'; // <-- AÑADIDO
		const domainsInput = document.getElementById('allowed-domains-input');
		const newAllowedDomains = (domainsInput?.value || '')
			.split('\n')
			.map(d => d.trim().toLowerCase())
			.filter(d => d.startsWith('@')); // Filtrar solo los que empiezan con @

		showLoading(true);
		try {
			// Función interna para validar URLs (http, https, uploads/, data:)
			const validateUrl = (url, fieldName) => {
				if (url && !/^(https?:\/\/|uploads\/|data:)/i.test(url)) {
					throw new Error(`URL de ${fieldName} no válida. Debe empezar con http://, https://, uploads/ o data:.`);
				}
			};

			// Validar URLs
			validateUrl(newAppLogoUrl, "Logo Principal");
			validateUrl(newTicketLogoUrl, "Logo de Entrada");
			validateUrl(newBannerUrl, "Banner");

			// Validar Color Hex
			if (!/^#[0-9A-F]{6}$/i.test(newPromoNeonColor)) {
				throw new Error("El color neón debe ser un código hexadecimal válido (ej: #F02D7D).");
			}

			// Actualizar appState
			appState.appLogoUrl = newAppLogoUrl;
			appState.ticketLogoUrl = newTicketLogoUrl;
			appState.bannerVideoUrl = newBannerUrl;
			appState.promoEnabled = newPromoEnabled;
			appState.promoCustomText = newPromoText;
			appState.promoNeonColor = newPromoNeonColor; // <-- AÑADIDO
			appState.allowedDomains = newAllowedDomains;

			// Guardar en servidor
			await saveAppState();

			// Re-renderizar elementos afectados en la UI
			renderAppLogo();
			renderBannerVideo();
			renderNextEventPromo();

			showLoading(false);
			showInfoModal("¡CONTENIDO GENERAL ACTUALIZADO!", false);

			// Limpiar inputs de archivo (opcional, pero buena práctica)
			if (appLogoUploadInput) appLogoUploadInput.value = '';
			if (ticketLogoUploadInput) ticketLogoUploadInput.value = '';
			if (bannerUploadInput) bannerUploadInput.value = '';

		} catch (error) {
			console.error("Error saving content:", error);
			showLoading(false);
			showInfoModal(`Error al guardar contenido: ${error.message}`, true);
		}
	}

	/**
	 * Guarda las URLs de la galería para el evento seleccionado.
	 * MODIFICADO: Lee las URLs del input oculto actualizado por renderAdminGalleryGrid.
	 */
	async function handleSaveGallery(e) {
		e.preventDefault();
		// Usar el ID del input oculto directamente
		const hiddenGalleryInput = document.getElementById('gallery-urls-input');
		if (!galleryEventSelect || !hiddenGalleryInput || !appState || !appState.events) return;

		const eventId = parseInt(galleryEventSelect.value, 10);
		if (isNaN(eventId)) {
			showInfoModal("Selecciona un evento para guardar la galería.", true); return;
		}

		const eventIndex = appState.events.findIndex(e => e.id === eventId);
		if (eventIndex === -1) {
			showInfoModal("Error: Evento no encontrado.", true); return;
		}

		// Obtener URLs del input oculto (ya filtradas por renderAdminGalleryGrid)
		const newGalleryUrls = (hiddenGalleryInput.value || '')
			.split('\n')
			.filter(url => url); // Filtrar líneas vacías por si acaso

		showLoading(true);
		try {
			// Actualizar galería en el evento
			if (!appState.events[eventIndex].galleryImages) {
				appState.events[eventIndex].galleryImages = []; // Asegurar array
			}
			appState.events[eventIndex].galleryImages = newGalleryUrls;
			currentEvents = [...appState.events]; // Actualizar copia local

			// Guardar estado completo
			await saveAppState();

			// Re-renderizar vistas afectadas
			renderGalleryEventList(); // Actualizar lista principal de galerías
			renderPastGalleries(currentEvents); // Actualizar galerías pasadas en home
			// Si se estaba viendo esa galería, re-renderizarla (opcional)
			if (pages['gallery'] && !pages['gallery'].classList.contains('hidden') && galleryImageViewContainer && !galleryImageViewContainer.classList.contains('hidden')) {
				const currentGalleryTitle = galleryImageViewTitle?.textContent;
				const eventName = appState.events[eventIndex].name;
				if (currentGalleryTitle === eventName) {
					renderGalleryImages(eventId);
				}
			}


			showLoading(false);
			showInfoModal("¡GALERÍA GUARDADA!", false);
			if (galleryUploadInput) galleryUploadInput.value = ''; // Limpiar input file

		} catch (error) {
			console.error("Error saving gallery:", error);
			showLoading(false);
			showInfoModal("Error al guardar la galería: " + error.message, true);
		}
	}

	/**
	 * Carga las URLs de la galería del evento seleccionado en el textarea.
	 * MODIFICADO: Llama a renderAdminGalleryGrid para mostrar las miniaturas.
	 */
	function handleGalleryEventSelect() {
		// Asegurar que existan los elementos necesarios
		if (!galleryEventSelect || !adminGalleryPreviewGrid || !appState || !appState.events) {
			console.error("Faltan elementos para manejar la selección de evento de galería.");
			return;
		}

		const eventId = parseInt(galleryEventSelect.value, 10);
		const hiddenInputId = 'gallery-urls-input'; // ID del input oculto
		const containerId = 'admin-gallery-preview-grid'; // ID de la rejilla

		let imageUrls = []; // Array vacío por defecto

		if (!isNaN(eventId)) {
			const event = appState.events.find(e => e.id === eventId);
			imageUrls = event?.galleryImages || []; // Obtener URLs o array vacío
		}

		// Renderizar la rejilla (mostrará mensaje si imageUrls está vacío)
		renderAdminGalleryGrid(containerId, hiddenInputId, imageUrls);

		// Limpiar input file al cambiar evento
		if (galleryUploadInput) galleryUploadInput.value = '';
	}


	/**
	 * Guarda un evento nuevo o actualiza uno existente.
	 */
	async function handleSaveEvent(e) {
		e.preventDefault();
		if (!addEventForm || !appState) return;

		const eventIdToSave = editingEventId; // Null si es nuevo
		const formData = new FormData(addEventForm);

		// Recoger y validar datos
		const eventName = formData.get('event-name')?.trim().toUpperCase() || '';
		const eventDate = formData.get('event-date'); // YYYY-MM-DDTHH:mm
		const eventPrice = parseFloat(formData.get('event-price'));
		const eventCapacity = parseInt(formData.get('event-capacity'), 10);
		const eventDescription = formData.get('event-description')?.trim() || '';
		const eventPosterUrl = formData.get('event-poster-url')?.trim() || '';

		// Validaciones
		if (!eventName || !eventDescription) {
			showInfoModal("Nombre y Descripción son obligatorios.", true); return;
		}
		if (!eventDate) {
			showInfoModal("La Fecha y Hora son obligatorias.", true); return;
		}
		if (isNaN(eventPrice) || eventPrice < 0) {
			showInfoModal("El Precio debe ser un número válido (0 o mayor).", true); return;
		}
		// Permitir 0 como capacidad ilimitada, pero no negativo
		if (isNaN(eventCapacity) || eventCapacity < 0) {
			showInfoModal("La Capacidad debe ser un número válido (0 o mayor, 0 para ilimitado).", true); return;
		}
		if (eventPosterUrl && !(eventPosterUrl.startsWith('http') || eventPosterUrl.startsWith('uploads/'))) {
			showInfoModal("La URL del cartel no es válida (http o uploads/).", true); return;
		}

		// Validar fecha (evitar mover futuro a pasado)
		try {
			const inputDate = new Date(eventDate);
			if (isNaN(inputDate.getTime())) throw new Error("Formato de fecha inválido."); // Chequeo extra
			const originalEvent = eventIdToSave ? appState.events.find(ev => ev.id === eventIdToSave) : null;
			// Si estamos EDITANDO un evento FUTURO y la NUEVA fecha es en el PASADO, bloquear.
			if (originalEvent && originalEvent.date && new Date(originalEvent.date) > new Date() && inputDate < new Date()) {
				showInfoModal("No puedes mover un evento futuro al pasado.", true); return;
			}
		} catch (dateError) {
			showInfoModal(`Error con la fecha introducida: ${dateError.message}`, true); return;
		}


		showLoading(true);
		try {
			if (eventIdToSave !== null) { // Actualizar evento existente
				const eventIndex = appState.events.findIndex(ev => ev.id === eventIdToSave);
				if (eventIndex > -1) {
					const existingEvent = appState.events[eventIndex];
					// Actualizar datos manteniendo ID, ticketsSold, galleryImages, isArchived
					appState.events[eventIndex] = {
						...existingEvent, // Mantener campos existentes no modificados
						name: eventName,
						date: eventDate,
						price: eventPrice,
						ticketCapacity: eventCapacity,
						description: eventDescription,
						posterImageUrl: eventPosterUrl
					};
					currentEvents = [...appState.events]; // Actualizar copia local
					await saveAppState(); // Guardar
					showInfoModal("¡EVENTO ACTUALIZADO!", false);
				} else {
					throw new Error("Evento a editar no encontrado.");
				}
			} else { // Añadir nuevo evento
				const newEvent = {
					id: appState.nextEventId++, // Usar y luego incrementar
					name: eventName,
					date: eventDate,
					price: eventPrice,
					ticketCapacity: eventCapacity,
					description: eventDescription,
					ticketsSold: 0, // Nuevo evento empieza con 0 vendidos
					galleryImages: [], // Nuevo evento empieza sin galería
					posterImageUrl: eventPosterUrl,
					isArchived: false // Nuevo evento nunca está archivado
				};
				if (!Array.isArray(appState.events)) appState.events = []; // Asegurar array
				appState.events.push(newEvent);
				currentEvents = [...appState.events]; // Actualizar copia local
				await saveAppState(); // Guardar
				showInfoModal("¡EVENTO AÑADIDO!", false);
			}

			resetEventForm(); // Limpiar formulario

			// Re-renderizar todas las vistas afectadas
			renderPublicEvents(currentEvents);
			renderHomeEvents(currentEvents);
			renderAdminEvents(currentEvents);
			renderGiveawayEvents(currentEvents);
			renderNextEventPromo();
			loadContentToAdmin(); // Recargar select de galerías

		} catch (error) {
			console.error("Error saving event:", error);
			showInfoModal("Error al guardar el evento: " + error.message, true);
		} finally {
			showLoading(false);
		}
	}


	/**
	 * Marca un evento como archivado (simulación de confirmación).
	 */
	async function handleArchiveEvent(e) {
		const eventId = parseInt(e.target.dataset.eventId, 10);
		if (isNaN(eventId) || !appState || !appState.events) return;

		const eventIndex = appState.events.findIndex(e => e.id === eventId);
		if (eventIndex === -1) {
			showInfoModal("Error: Evento no encontrado para archivar.", true); return;
		}
		if (appState.events[eventIndex].isArchived) return; // Ya archivado

		const eventName = appState.events[eventIndex].name || 'este evento';

		// Simulación de confirmación
		console.warn(`Simulando confirmación para archivar evento: ${eventName} (ID: ${eventId})`);
		showLoading(true);
		try {
			appState.events[eventIndex].isArchived = true;
			currentEvents = [...appState.events]; // Actualizar copia local
			await saveAppState(); // Guardar

			showLoading(false);
			showInfoModal(`EVENTO "${eventName}" ARCHIVADO.`, false);

			// Re-renderizar vistas
			renderPublicEvents(currentEvents);
			renderHomeEvents(currentEvents);
			renderAdminEvents(currentEvents);
			renderNextEventPromo();
			loadContentToAdmin(); // Actualizar estado en select galerías

		} catch (error) {
			console.error("Error archiving event:", error);
			showLoading(false);
			// Revertir cambio en memoria si falla guardado?
			appState.events[eventIndex].isArchived = false;
			currentEvents = [...appState.events];
			renderAdminEvents(currentEvents); // Re-renderizar lista admin para quitar estado archivado visual
			showInfoModal("Error al archivar el evento: " + error.message, true);
		}
	}

	/**
	 * Elimina un evento y sus tickets asociados (simulación de confirmación).
	 */
	async function handleDeleteEvent(e) {
		const eventId = parseInt(e.target.dataset.eventId, 10);
		if (isNaN(eventId) || !appState || !appState.events || !allTickets) return;

		const eventIndex = appState.events.findIndex(ev => ev.id === eventId);
		if (eventIndex === -1) {
			showInfoModal("Error: Evento no encontrado para eliminar.", true); return;
		}
		const eventToDelete = appState.events[eventIndex];
		const eventName = eventToDelete.name || 'este evento';

		// Simulación de confirmación
		console.warn(`Simulando confirmación para eliminar evento: ${eventName} (ID: ${eventId})`);
		showLoading(true);
		try {
			// Eliminar evento de appState
			appState.events.splice(eventIndex, 1);
			currentEvents = [...appState.events]; // Actualizar copia local

			// Filtrar tickets asociados
			const initialTicketCount = allTickets.length;
			allTickets = allTickets.filter(t => t.eventId !== eventId);
			const removedTicketCount = initialTicketCount - allTickets.length;
			if (removedTicketCount > 0) {
				console.log(`Eliminados ${removedTicketCount} tickets asociados al evento ${eventId}.`);
			}

			// Si se estaba editando este evento, resetear form
			if (editingEventId === eventId) {
				resetEventForm();
			}

			// Guardar ambos estados
			await saveAppState();
			await saveTicketState();

			showLoading(false);
			showInfoModal(`EVENTO "${eventName}" Y SUS ENTRADAS ELIMINADOS.`, false);

			// Re-renderizar TODO
			renderPublicEvents(currentEvents);
			renderHomeEvents(currentEvents);
			renderAdminEvents(currentEvents);
			renderGiveawayEvents(currentEvents);
			renderGalleryEventList();
			renderPastGalleries(currentEvents);
			renderNextEventPromo();
			loadContentToAdmin(); // Recargar selects

		} catch (error) {
			console.error("Error deleting event:", error);
			showLoading(false);
			// Revertir cambios en memoria si falla? Complicado sincronizar.
			// Mejor mostrar error y potencialmente recargar datos iniciales.
			showInfoModal("Error al eliminar el evento: " + error.message, true);
		}
	}


	// --- Ticketing Logic ---

	/**
	 * Inicia el proceso de compra de ticket para un evento.
	 */
	function handleGetTicket(e) {
		const eventId = parseInt(e.target.dataset.eventId, 10);
		if (isNaN(eventId) || !appState || !appState.events) return;

		pendingEventId = eventId; // Guardar ID para el modal de email
		const event = appState.events.find(ev => ev.id === eventId);
		if (!event) {
			showInfoModal("Error: Evento no encontrado.", true); pendingEventId = null; return;
		}

		// Validaciones antes de mostrar modal de email
		if (event.isArchived) {
			showInfoModal("Este evento está archivado y ya no acepta entradas.", true); pendingEventId = null; return;
		}
		if (event.date && new Date(event.date) < new Date()) {
			showInfoModal("ESTE EVENTO YA HA FINALIZADO.", true); pendingEventId = null; return;
		}
		const capacity = event.ticketCapacity || 0;
		const sold = event.ticketsSold || 0;
		if (capacity > 0 && sold >= capacity) {
			showInfoModal("¡ENTRADAS AGOTADAS!", true); pendingEventId = null; return;
		}

		// Mostrar modal de email
		if (emailForm) {
			emailForm.reset(); // Limpiar form
			emailForm['ticket-quantity'].value = 1; // Default cantidad
		}
		emailModal?.classList.remove('hidden');
	}

	/**
	 * Procesa el formulario de email/cantidad/nombre y genera el ticket si es válido.
	 * MODIFICADO: Valida y recoge nombre/apellidos.
	 */
	async function handleEmailSubmit(e) {
		e.preventDefault();
		if (!emailForm || pendingEventId === null || !appState || !appState.events || !allTickets) {
			closeModal('email-modal'); // Cerrar modal si hay error interno
			pendingEventId = null;
			return;
		}

		// NUEVO: Recoger nombre y apellidos
		const userName = emailForm['ticket-nombre'].value.trim();
		const userSurname = emailForm['ticket-apellidos'].value.trim();
		const userEmail = emailForm['ticket-email'].value.trim().toLowerCase();
		const quantity = parseInt(emailForm['ticket-quantity'].value, 10);
		const eventId = pendingEventId; // Usar el ID guardado
		pendingEventId = null; // Resetear ID pendiente

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		// NUEVO: Validar Nombre y Apellidos
		if (!userName || !userSurname) {
			showInfoModal("POR FAVOR, INTRODUCE TU NOMBRE Y APELLIDOS.", true); return; // No cerrar modal
		}
		if (!userEmail || !emailRegex.test(userEmail)) {
			showInfoModal("POR FAVOR, INTRODUCE UN EMAIL VÁLIDO.", true); return; // No cerrar modal
		}
		// Validar Email (Dominios)
		const allowedDomains = appState.allowedDomains || [];
		const isDomainAllowed = allowedDomains.length === 0 || allowedDomains.some(domain => userEmail.endsWith(domain));
		if (!isDomainAllowed) {
			showInfoModal("Dominio de correo no permitido.", true); return; // No cerrar modal
		}
		if (isNaN(quantity) || quantity <= 0) {
			showInfoModal("POR FAVOR, INTRODUCE UNA CANTIDAD MAYOR QUE CERO.", true); return; // No cerrar modal
		}

		const event = appState.events.find(ev => ev.id === eventId);
		if (!event) {
			showInfoModal("Error: Evento no encontrado.", true); closeModal('email-modal'); return;
		}

		// Comprobar si el email YA tiene entrada para ESTE evento
		const existingTicket = allTickets.find(t => t.eventId === eventId && t.email === userEmail);
		if (existingTicket) {
			closeModal('email-modal');
			const holderName = `${existingTicket.nombre || ''} ${existingTicket.apellidos || ''}`.trim() || userEmail; // Nombre guardado o email
			// Mostrar modal informativo y luego el QR existente
			// NUEVO: Reenviar email automáticamente
			showInfoModal(`Ya tienes entrada. Reenviando correo a ${userEmail}...`, false);

			fetch('resend_ticket_email.php', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ticketId: existingTicket.ticketId,
					email: userEmail
				})
			})
				.then(res => res.json())
				.then(data => {
					if (data.success) {
						showInfoModal(`Correo reenviado correctamente a ${userEmail}.<br>Revisa tu bandeja de entrada (y spam).`, false, () => {
							displayTicketModal(event, existingTicket.ticketId, userEmail, existingTicket.quantity, holderName);
						});
					} else {
						showInfoModal(`Error al reenviar correo: ${data.message}`, true, () => {
							displayTicketModal(event, existingTicket.ticketId, userEmail, existingTicket.quantity, holderName);
						});
					}
				})
				.catch(err => {
					console.error("Error reenviando email:", err);
					displayTicketModal(event, existingTicket.ticketId, userEmail, existingTicket.quantity, holderName);
				});

			return;
		}

		// Re-validar estado del evento (podría haber cambiado mientras el modal estaba abierto)
		if (event.isArchived || (event.date && new Date(event.date) < new Date())) {
			showInfoModal("Este evento ya no está disponible.", true); closeModal('email-modal'); return;
		}
		const capacity = event.ticketCapacity || 0;
		// Usar la suma de cantidades reales en `allTickets` como `currentSold` es más seguro que `event.ticketsSold`
		const currentSold = allTickets
			.filter(t => t.eventId === eventId)
			.reduce((sum, t) => sum + (t.quantity || 0), 0);
		// const currentSold = event.ticketsSold || 0; // Usar el contador guardado (menos seguro si hay desync)

		if (capacity > 0 && (currentSold + quantity) > capacity) {
			const remaining = Math.max(0, capacity - currentSold); // Asegurar no negativo
			showInfoModal(remaining === 0 ? "¡ENTRADAS AGOTADAS!" : `Solo quedan ${remaining} entrada(s). Introduce una cantidad menor o igual.`, true);
			pendingEventId = eventId; // Restaurar ID pendiente para reintentar
			return; // No cerrar modal
		}

		// Si todo OK, cerrar modal y generar ticket
		closeModal('email-modal');
		// MODIFICADO: Pasar nombre y apellidos a generateTicket
		await generateTicket(eventId, userName, userSurname, userEmail, quantity);
	}

	/**
	 * Genera un nuevo ticket, actualiza estados y muestra el modal del QR.
	 * MODIFICADO: Acepta y guarda nombre/apellidos. Actualiza contador ticketsSold de forma segura.
	 */
	/**
	 * Genera un nuevo ticket, actualiza estados y muestra el modal del QR.
	 * MODIFICADO: Acepta y guarda nombre/apellidos. Actualiza contador ticketsSold de forma segura.
	 */
	/**
 * Genera un nuevo ticket, actualiza estados y muestra el modal del QR.
 * MODIFICADO: Acepta y guarda nombre/apellidos. Actualiza contador ticketsSold de forma segura.
 */
	async function generateTicket(eventId, userName, userSurname, userEmail, quantity) {
		if (!appState || !appState.events || !allTickets) return; // Comprobación robusta

		const eventIndex = appState.events.findIndex(ev => ev.id === eventId);
		if (eventIndex === -1) {
			showInfoModal("Error crítico: Evento no encontrado al generar ticket.", true); return;
		}
		const event = appState.events[eventIndex];

		let ticketId = null; // <-- CORRECCIÓN: Declarar ticketId aquí para scope

		showLoading(true);
		try {
			ticketId = crypto.randomUUID(); // Asignar el ID
			const fullName = `${userName} ${userSurname}`; // Combinar nombre

			// Crear objeto del nuevo ticket
			const newTicket = {
				ticketId: ticketId,
				eventId: event.id,
				// NUEVO: Guardar nombre y apellidos
				nombre: userName,
				apellidos: userSurname,
				email: userEmail,
				quantity: quantity
			};
			if (!Array.isArray(allTickets)) allTickets = []; // Asegurar array
			allTickets.push(newTicket); // Añadir al array global de tickets ANTES de calcular el nuevo total

			// Actualizar contador 'ticketsSold' en appState.events de forma segura
			// Recalcular la suma total de cantidades para este evento DESPUÉS de añadir el nuevo ticket
			const newTotalQuantitySold = allTickets
				.filter(t => t.eventId === eventId)
				.reduce((sum, t) => sum + (t.quantity || 0), 0);

			appState.events[eventIndex].ticketsSold = newTotalQuantitySold; // Sobrescribir con la suma correcta
			currentEvents = [...appState.events]; // Actualizar copia local

			// CORRECCIÓN: Guardar SÓLO el estado de los tickets (saveTicketState).
			// Un usuario normal NO PUEDE llamar a saveAppState() (que usa save.php)
			// y eso causaba el error 403 Forbidden.
			await saveTicketState();

			// Re-renderizar UI si el admin está logueado
			if (isLoggedIn) {
				renderAdminEvents(currentEvents);
				renderGiveawayEvents(currentEvents);
			}
			// Re-renderizar UI pública
			renderPublicEvents(currentEvents);
			renderHomeEvents(currentEvents);

			console.log(`Ticket NUEVO generado: ${quantity} para ${event.name} -> ${fullName} (${userEmail}) (ID: ${ticketId})`);

			// Mostrar el modal del QR
			// MODIFICADO: Pasar nombre completo al mostrar modal
			displayTicketModal(event, ticketId, userEmail, quantity, fullName);

		} catch (error) {
			console.error("Error generando ticket:", error);

			// CORRECCIÓN: El 'ticketId' ahora es accesible aquí
			if (ticketId) { // Solo intentar quitar si se generó un ID
				const addedTicketIndex = allTickets.findIndex(t => t.ticketId === ticketId);
				if (addedTicketIndex > -1) {
					allTickets.splice(addedTicketIndex, 1); // Quitar el ticket si falló el guardado
					// Recalcular contador si se quita el ticket? Sí, por consistencia local.
					const eventIndexFallback = appState.events.findIndex(ev => ev.id === eventId);
					if (eventIndexFallback > -1) {
						const fallbackTotal = allTickets
							.filter(t => t.eventId === eventId)
							.reduce((sum, t) => sum + (t.quantity || 0), 0);
						appState.events[eventIndexFallback].ticketsSold = fallbackTotal;
						currentEvents = [...appState.events];
					}
				}
			}
			showInfoModal("Error al generar tu entrada. Inténtalo de nuevo más tarde.", true);
		} finally {
			showLoading(false);
		}
	}





	/**
* Muestra el modal con los detalles del ticket y el QR.
* MODIFICADO: Acepta y muestra el nombre completo. Actualiza QR text.
* AÑADIDO: Muestra el cartel del evento en pequeño.
*/
	function displayTicketModal(event, ticketId, userEmail, quantity, fullName) {
		if (!event || !ticketId || !userEmail || quantity <= 0 || !fullName || !ticketModal || !ticketQrCode || !downloadTicketBtn || !ticketHolderName) {
			console.error("Faltan datos o elementos para mostrar el modal del ticket.");
			showInfoModal("Error al mostrar los detalles de tu entrada.", true);
			if (loadingModal && !loadingModal.classList.contains('hidden')) showLoading(false); // Asegurar quitar loading si falla aquí
			return;
		}

		try {
			// Referencias a los nuevos elementos del cartel
			const ticketEventPosterContainer = document.getElementById('ticket-event-poster-container');
			const ticketEventPosterImg = document.getElementById('ticket-event-poster-img');

			// Configurar logo del ticket
			const ticketLogoImg = document.getElementById('ticket-logo-img');
			if (ticketLogoImg) {
				const logoUrl = appState.ticketLogoUrl || '';
				ticketLogoImg.src = logoUrl;
				ticketLogoImg.onerror = () => { ticketLogoImg.classList.add('hidden'); };
				ticketLogoImg.classList.toggle('hidden', !logoUrl);
			}

			// --- NUEVO: Cartel del evento ---
			if (ticketEventPosterImg && ticketEventPosterContainer) {
				const posterUrl = event.posterImageUrl || '';
				if (posterUrl) {
					ticketEventPosterImg.src = posterUrl;
					ticketEventPosterImg.style.display = 'block';
					// Aseguramos que el contenedor esté visible y limpio de la clase 'hidden'
					ticketEventPosterContainer.classList.remove('hidden');
				} else {
					ticketEventPosterImg.src = '';
					ticketEventPosterImg.style.display = 'none';
					ticketEventPosterContainer.classList.add('hidden');
				}
			}
			// --- FIN NUEVO ---

			// Rellenar detalles del evento y nombre
			const eventDate = event.date ? new Date(event.date).toLocaleString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha N/A';
			// NUEVO: Mostrar nombre completo
			ticketHolderName.textContent = fullName;
			if (ticketEventName) ticketEventName.textContent = event.name || 'Evento';
			if (ticketEventDate) ticketEventDate.textContent = eventDate;
			if (ticketQuantityDetails) ticketQuantityDetails.textContent = `Cantidad: ${quantity}`;

			// Generar QR
			ticketQrCode.innerHTML = ''; // Limpiar anterior
			// MODIFICADO: Añadir NOMBRE al QR text
			const qrText = `TICKET_ID:${ticketId}`;

			if (typeof QRCode !== 'undefined') {
				new QRCode(ticketQrCode, {
					text: qrText,
					width: 200, height: 200,
					colorDark: "#000000", colorLight: "#ffffff",
					correctLevel: QRCode.CorrectLevel.M // Nivel M
				});
			} else {
				ticketQrCode.innerHTML = '<p class="text-red-500 font-pixel">Error: QR no cargado</p>';
			}

			// Configurar botón de descarga
			downloadTicketBtn.dataset.eventName = event.name || 'evento'; // Para nombre archivo
			// NUEVO: Guardar nombre para nombre archivo
			downloadTicketBtn.dataset.holderName = fullName.replace(/\s+/g, '_'); // Reemplazar espacios

			ticketModal.classList.remove('hidden'); // Mostrar modal

		} catch (error) {
			console.error("Error displaying ticket modal:", error);
			showInfoModal("Error al mostrar los detalles de tu entrada.", true);
			if (loadingModal && !loadingModal.classList.contains('hidden')) showLoading(false); // Asegurar quitar loading
		}
	}


	/**
	 * Descarga el contenido del modal del ticket como imagen PNG.
	 * MODIFICADO: Usa el nombre del comprador en el nombre del archivo.
	 */
	async function handleDownloadTicket() {
		if (!ticketToDownload || typeof html2canvas === 'undefined' || !downloadTicketBtn) {
			showInfoModal("Error: No se pudo iniciar la descarga (faltan elementos).", true); return;
		}

		const eventName = downloadTicketBtn.dataset.eventName || 'evento';
		const holderName = downloadTicketBtn.dataset.holderName || 'comprador'; // Nuevo
		const safeEventName = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
		const safeHolderName = holderName.replace(/[^a-z0-9_]/gi, '').toLowerCase(); // Permitir guión bajo

		showLoading(true);
		try {
			const canvas = await html2canvas(ticketToDownload, { scale: 2, backgroundColor: "#000000" }); // Fondo negro
			const dataUrl = canvas.toDataURL('image/png');
			const link = document.createElement('a');
			link.href = dataUrl;
			// MODIFICADO: Añadir nombre al archivo
			link.download = `entrada_rodetes_${safeHolderName}_${safeEventName}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			// No revokeObjectURL para data URLs

			showLoading(false);
			// No mostramos modal de éxito aquí, ya se mostró al generar/recuperar el ticket.

		} catch (error) {
			console.error("Error downloading ticket image:", error);
			showLoading(false);
			showInfoModal("Error al descargar la imagen de la entrada.", true);
		}
	}

	// --- FIN PARTE 2 ---
	// (Ahora viene la parte 3)


	// --- Lógica de subida de archivos (Actualizada para usar UPLOAD_URL) ---

	/**
	 * Maneja la subida de un solo archivo (imagen o vídeo) al servidor.
	 * Llama a upload.php.
	 */
	async function handleFileUpload(event, targetInput) {
		const file = event.target.files?.[0]; // Usar optional chaining
		if (!file || !targetInput) return;

		let acceptTypes = ['image/'];
		let fileTypeForUpload = 'image';
		const isBannerInput = targetInput === bannerUrlInput;

		// Determinar tipo aceptado y tipo para PHP
		if (isBannerInput) {
			acceptTypes = ['image/', 'video/mp4', 'video/webm']; // Banner acepta vídeo
			if (file.type.startsWith('video/')) {
				fileTypeForUpload = 'video';
			}
		} // Otros inputs solo aceptan imagen

		// Validar tipo MIME
		if (!acceptTypes.some(type => file.type.startsWith(type))) {
			showInfoModal(`Tipo de archivo no permitido. ${isBannerInput ? 'Sube imagen o vídeo MP4/WebM.' : 'Sube una imagen.'}`, true);
			event.target.value = ''; return;
		}

		// Validar tamaño
		const maxSizeMB = fileTypeForUpload === 'video' ? 10 : 5; // 10MB vídeo, 5MB imagen
		const maxSizeBytes = maxSizeMB * 1024 * 1024;
		if (file.size > maxSizeBytes) {
			showInfoModal(`Archivo "${file.name}" demasiado grande (Máx ${maxSizeMB}MB).`, true);
			event.target.value = ''; return;
		}

		showLoading(true);

		const formData = new FormData();
		formData.append('file', file); // El archivo en sí
		formData.append('type', fileTypeForUpload); // 'image' o 'video' para PHP

		try {
			const response = await fetch(UPLOAD_URL, {
				method: 'POST',
				body: formData
				// No 'Content-Type' header para FormData, el navegador lo pone con el boundary correcto
			});

			const result = await response.json(); // Intentar parsear siempre

			if (!response.ok) {
				// Manejar errores HTTP y de PHP (incluido 403 si sesión expiró)
				let errorMessage = `Error HTTP ${response.status}.`;
				if (response.status === 403) {
					errorMessage = "Acceso denegado. Tu sesión puede haber expirado.";
					handleLogout(false);
				} else if (result && result.message) {
					errorMessage = result.message;
				}
				throw new Error(errorMessage);
			}

			if (result.success && result.url) {
				targetInput.value = result.url; // Poner la URL devuelta por PHP en el input
				showInfoModal(`${fileTypeForUpload === 'video' ? 'Vídeo' : 'Imagen'} "${file.name}" subido. Guarda los cambios del formulario.`, false);
			} else {
				throw new Error(result.message || 'Error desconocido del servidor al subir.');
			}
		} catch (error) {
			console.error("Error uploading file:", error);
			showInfoModal(`Error al subir "${file.name}": ${error.message}`, true);
			event.target.value = ''; // Limpiar input file si falla
		} finally {
			showLoading(false);
		}
	}


	/**
		 * Maneja la subida de múltiples imágenes al servidor.
		 * Llama a upload.php para cada archivo.
		 * MODIFICADO: Acepta ID del input oculto y ID de la rejilla para actualizarla.
		 */
	async function handleMultipleFileUpload(event, hiddenInputId, gridContainerId) { // <-- AÑADIDOS PARÁMETROS
		const files = event.target.files;
		const targetHiddenInput = document.getElementById(hiddenInputId); // Obtener input oculto

		if (!files || files.length === 0 || !targetHiddenInput) return; // Validar input oculto

		showLoading(true);
		const uploadPromises = [];
		let successCount = 0;
		let errorCount = 0;
		const maxSizeMB = 5; // Límite por imagen
		const maxSizeBytes = maxSizeMB * 1024 * 1024;

		// Crear promesas de subida para cada archivo válido
		for (const file of files) {
			if (!file.type.startsWith('image/')) {
				console.warn("Omitiendo archivo no imagen:", file.name);
				errorCount++; // Contar como error si se seleccionó archivo no válido
				showInfoModal(`"${file.name}" no es una imagen y fue omitido.`, true); // Notificar
				continue; // Saltar este archivo
			}
			if (file.size > maxSizeBytes) {
				console.warn(`Omitiendo archivo grande: ${file.name} (Máx ${maxSizeMB}MB)`);
				errorCount++;
				showInfoModal(`Error: "${file.name}" excede el límite (${maxSizeMB}MB).`, true);
				continue; // Saltar este archivo
			}

			const formData = new FormData();
			formData.append('file', file);
			formData.append('type', 'image'); // Siempre 'image' para múltiple

			uploadPromises.push(
				fetch(UPLOAD_URL, { method: 'POST', body: formData })
					.then(response => response.json().then(result => ({ ok: response.ok, status: response.status, result }))) // Parsear siempre y pasar estado ok
					.then(({ ok, status, result }) => {
						if (ok && result.success && result.url) {
							successCount++;
							return result.url; // Devolver URL si éxito
						} else {
							errorCount++;
							let errorMessage = `Error subiendo ${file.name}: `;
							if (status === 403) errorMessage += "Acceso denegado (sesión?).";
							else errorMessage += result.message || `Error HTTP ${status}.`;
							console.warn(errorMessage);
							showInfoModal(errorMessage, true); // Mostrar error específico
							return null; // Indicar fallo
						}
					})
					.catch(err => {
						errorCount++;
						console.error(`Error de red subiendo ${file.name}:`, err);
						showInfoModal(`Error de red subiendo ${file.name}.`, true);
						return null; // Indicar fallo
					})
			);
		}

		// Esperar a que todas las subidas terminen
		try {
			const results = await Promise.all(uploadPromises);
			const newUrls = results.filter(url => url !== null); // Filtrar fallos

			if (newUrls.length > 0) {
				// Añadir nuevas URLs al input oculto, manteniendo las existentes
				const existingUrls = targetHiddenInput.value.trim();
				targetHiddenInput.value = existingUrls + (existingUrls ? '\n' : '') + newUrls.join('\n');

				// --- NUEVO: Actualizar la rejilla visual ---
				if (gridContainerId) {
					const currentUrls = targetHiddenInput.value.split('\n').filter(Boolean);
					renderAdminGalleryGrid(gridContainerId, hiddenInputId, currentUrls);
				}
				// --- FIN NUEVO ---
			}

			// Mostrar resumen
			let message = `${successCount} imágen(es) añadida(s) a la lista.`;
			if (errorCount > 0) message += ` (${errorCount} fallaron o fueron omitidas).`;
			if (successCount > 0) message += " Pulsa Guardar para confirmar los cambios.";
			showInfoModal(message, errorCount > 0 && successCount === 0); // Error solo si NADA subió

		} catch (error) { // Error inesperado en Promise.all (raro)
			console.error("Error procesando subidas múltiples:", error);
			showInfoModal("Error inesperado al procesar las subidas.", true);
		} finally {
			showLoading(false);
			event.target.value = ''; // Limpiar input file siempre
		}
	}


	// --- Backup / Restore (JSZip sigue siendo client-side) ---

	/**
	 * Crea y descarga un archivo ZIP con los datos e imágenes del servidor.
	 * Llama a create_backup.php para incluir todos los ficheros JSON y la carpeta uploads/.
	 */
	function handleBackup() {
		if (!isLoggedIn) {
			showInfoModal("Debes iniciar sesión para realizar una copia de seguridad.", true);
			return;
		}

		showInfoModal("Generando copia de seguridad...<br>Incluye base de datos e imágenes.", false);

		// Redirigir al script PHP que genera y descarga el ZIP
		setTimeout(() => {
			window.location.href = 'create_backup.php';
		}, 800);
	}

	/**
	 * Restaura el estado desde un archivo ZIP (datos + imágenes) o JSON (antiguo).
	 */
	async function handleRestore(event) {
		const file = event.target.files?.[0];
		if (!file) return;

		showLoading(true);

		try {
			// --- Caso 1: Restauración Completa desde ZIP ---
			if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
				console.log("Iniciando restauración completa desce ZIP...");

				const formData = new FormData();
				formData.append('backup_file', file);

				const response = await fetch('restore_backup.php', {
					method: 'POST',
					body: formData
				});

				const result = await response.json();

				if (result.success) {
					showInfoModal("¡RESTAURACIÓN COMPLETA ÉXITOSA!<br>La página se recargará para aplicar los cambios.", false);
					setTimeout(() => {
						window.location.reload();
					}, 2000);
				} else {
					throw new Error(result.message || "Error desconocido en el servidor.");
				}

				return; // Salir aquí ya que el resto es para JSON antiguo
			}

			// --- Caso 2: Restauración desde archivo JSON (formato antiguo) ---
			if (file.type === 'application/json' || file.name.endsWith('.json')) {
				console.log("Restaurando desde archivo JSON (formato antiguo)...");
				const jsonString = await readFileAsText(file);
				const oldState = JSON.parse(jsonString);

				let restoredTickets = [];
				let restoredMerchSales = [];
				let restoredState = null;

				// Validar estructura básica antigua
				if (oldState && Array.isArray(oldState.events)) {
					// Extraer tickets del formato antiguo y limpiar events
					oldState.events.forEach(event => {
						if (event.purchasedTickets && typeof event.purchasedTickets === 'object') {
							Object.keys(event.purchasedTickets).forEach(email => {
								const ticket = event.purchasedTickets[email];
								if (ticket && ticket.ticketId && ticket.quantity) {
									restoredTickets.push({
										ticketId: ticket.ticketId, eventId: event.id,
										email: email, quantity: ticket.quantity
									});
								}
							});
						}
						delete event.purchasedTickets;
					});
					restoredState = oldState;
				} else {
					// Si es un backup JSON del nuevo formato pero suelto (sin ZIP)
					restoredState = oldState;
					// No tenemos tickets ni merch sales en este caso, se quedarían vacíos o 
					// podríamos intentar inferirlos si el JSON fuera entradas_db.json, pero
					// handleRestore históricamente esperaba el appState completo.
				}

				if (!restoredState || !Array.isArray(restoredState.events)) {
					throw new Error("El archivo JSON no tiene un formato reconocido.");
				}

				// Aplicar appState
				appState = {
					...(restoredState || {}),
					events: (restoredState.events || []).map(ev => ({ galleryImages: [], ...ev })),
					drags: (restoredState.drags || []).map(drag => ({
						description: "", coverImageUrl: "", instagramHandle: "",
						cardColor: "#FFFFFF", galleryImages: [], merchItems: [], ...drag
					})),
					webMerch: restoredState.webMerch || [],
					allowedDomains: restoredState.allowedDomains || [],
					scannedTickets: restoredState.scannedTickets || {},
					nextEventId: restoredState.nextEventId || 1,
					nextDragId: restoredState.nextDragId || 1,
					nextMerchItemId: restoredState.nextMerchItemId || 1
				};

				allTickets = restoredTickets;
				allMerchSales = restoredMerchSales;

				// Guardar en servidor
				await Promise.all([
					saveAppState(),
					saveTicketState(),
					saveMerchSalesState()
				]);

				showInfoModal("¡DATOS RESTAURADOS CON ÉXITO! (Sin imágenes)", false);
				setTimeout(() => window.location.reload(), 1500);

			} else {
				throw new Error("Tipo de archivo no soportado. Sube un .zip o .json.");
			}

		} catch (error) {
			showLoading(false);
			console.error("Error restoring data:", error);
			showInfoModal(`Error al restaurar: ${error.message}`, true);
		} finally {
			if (restoreInput) restoreInput.value = '';
		}
	}


	// --- Auth Logic (Usando Fetch y PHP Session) ---

	/**
	 * Intenta iniciar sesión llamando a login.php.
	 */
	async function handleAdminLogin(e) {
		e.preventDefault();
		if (!loginForm) return;

		const email = loginForm.email.value.trim();
		const password = loginForm.password.value; // Contraseña en texto plano

		if (!email || !password) {
			showInfoModal("Introduce email y contraseña.", true); return;
		}

		showLoading(true);

		try {
			// Calcular el hash SHA-256 en JS (como se hacía antes)
			const encoder = new TextEncoder();
			const data = encoder.encode(password);
			const hashBuffer = await crypto.subtle.digest('SHA-256', data);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

			const response = await fetch(LOGIN_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email, hash: passwordHash }) // Enviar email y HASH
			});

			const result = await response.json();

			if (!response.ok) {
				// Error HTTP o credenciales incorrectas (PHP devuelve 401)
				throw new Error(result.message || `Error ${response.status}`);
			}

			if (result.success) {
				// ¡Login correcto! Actualizar estado y UI
				isLoggedIn = true;
				adminEmail = result.email || email; // Usar email devuelto por PHP si existe
				checkAdminUI(); // Actualiza la UI para mostrar panel/ocultar login
				showAdminPage('events'); // Ir a la pestaña de eventos por defecto
				loginForm.reset();
				// No necesitamos guardar timestamp en localStorage, PHP maneja la sesión
			} else {
				// Aunque response.ok fuera true, PHP podría devolver success: false
				throw new Error(result.message || 'Error desconocido en login.');
			}

		} catch (error) {
			console.error("Login error:", error);
			showInfoModal("Error de inicio de sesión: " + error.message, true);
			isLoggedIn = false; // Asegurar estado logout
			adminEmail = '';
			checkAdminUI();
		} finally {
			showLoading(false);
		}
	}

	/**
	 * Cierra la sesión llamando a logout.php.
	 * @param {boolean} [showSuccess=true] - Mostrar modal de éxito al cerrar sesión.
	 */
	async function handleLogout(showSuccess = true) {
		showLoading(true);
		try {
			const response = await fetch(LOGOUT_URL, { method: 'POST' });
			// No necesitamos enviar body
			// Asumimos que PHP siempre destruye la sesión y devuelve éxito si es POST

			if (!response.ok) {
				// Podría fallar si el servidor está caído, etc.
				console.warn(`Logout request failed with status ${response.status}`);
				// Aún así, forzamos logout en el frontend
			}

			// Siempre desloguear en el frontend, independientemente de la respuesta
			isLoggedIn = false;
			adminEmail = '';
			adminTapCounter = 0; // Resetear contador Easter Egg
			stopScanner(); // Detener scanner si estaba activo
			checkAdminUI(); // Ocultar panel, mostrar login (si está en página admin)
			showPage('home'); // Redirigir a la home

			if (showSuccess) {
				showInfoModal("Sesión cerrada.", false);
			}

		} catch (error) {
			// Error de red
			console.error("Logout network error:", error);
			// Forzar logout en frontend igualmente
			isLoggedIn = false;
			adminEmail = '';
			adminTapCounter = 0;
			stopScanner();
			checkAdminUI();
			showPage('home');
			showInfoModal("Error de red al cerrar sesión. Se ha forzado el cierre local.", true);
		} finally {
			showLoading(false);
		}
	}

	/**
	 * Comprueba el estado de login y actualiza la UI (panel/login form, links admin).
	 * Se llama al cargar la página y después de login/logout.
	 */
	function checkAdminUI() {
		const adminEmailEl = document.getElementById('admin-email');
		const mobileAdminLink = mobileNavLinks['admin'];

		if (isLoggedIn) {
			// --- UI para Admin Logueado ---
			if (loginForm) loginForm.classList.add('hidden'); // Ocultar login form
			if (adminPanel) adminPanel.classList.remove('hidden'); // Mostrar panel admin
			if (adminEmailEl) adminEmailEl.textContent = adminEmail; // Mostrar email
			if (scanQrBtn) scanQrBtn.classList.remove('hidden'); // Mostrar botón escanear
			if (mobileAdminLink) mobileAdminLink.classList.remove('hidden'); // Mostrar link admin en móvil

			// Cargar/Recargar contenido específico de admin si no se ha hecho ya
			// (esto asegura que si se loguea sin recargar, el contenido admin se carga)
			loadContentToAdmin();
			renderAdminEvents(currentEvents);
			renderAdminDrags(appState.drags);
			renderAdminMerch();
			renderGiveawayEvents(currentEvents);
			// showAdminPage('events'); // No cambiar de pestaña automáticamente aquí, solo al loguear

		} else {
			// --- UI para Usuario No Logueado ---
			if (loginForm) loginForm.classList.remove('hidden'); // Mostrar login form (si está en página admin)
			if (adminPanel) adminPanel.classList.add('hidden'); // Ocultar panel admin
			if (scanQrBtn) scanQrBtn.classList.add('hidden'); // Ocultar botón escanear
			if (mobileAdminLink) mobileAdminLink.classList.add('hidden'); // Ocultar link admin móvil

			// No necesitamos resetear adminTapCounter aquí, se hace en logout
			// No necesitamos eliminar 'rodetesAdminLinkVisibleTime' de localStorage, ya no se usa
		}
	}

	/**
	 * Maneja los taps en el botón de menú para revelar el link de Admin (Easter Egg).
	 * Ahora solo revela el link, el estado de login real viene de PHP.
	 */
	function handleAdminMenuTap() {
		const mobileAdminLink = mobileNavLinks['admin'];
		if (!mobileAdminLink) return; // No hacer nada si el link no existe

		// Si ya está logueado (y por tanto el link visible), no hacer nada con el contador
		if (isLoggedIn) {
			adminTapCounter = 0; // Resetear si ya está logueado
			return;
		}

		// Incrementar contador solo si no está logueado y el link está oculto
		if (mobileAdminLink.classList.contains('hidden')) {
			adminTapCounter++;
			console.log("Admin tap:", adminTapCounter);
			if (adminTapCounter >= 5) {
				mobileAdminLink.classList.remove('hidden'); // Mostrar link
				// Ya no guardamos timestamp, la visibilidad se resetea al recargar si no loguea
				showInfoModal("Acceso a Panel Administrador ¡Concedido!", false);
				adminTapCounter = 0; // Resetear tras revelarlo
			}
		} else {
			// Si el link está visible pero NO está logueado (por taps previos sin recarga), resetear.
			adminTapCounter = 0;
		}
	}

	// --- QR Scanner Logic (NUEVO con html5-qrcode) ---

	/**
	 * Inicia el nuevo escáner usando html5-qrcode.
	 * Se llama al pulsar el botón "Escanear QR".
	 */
	/**
	 * Inicia el nuevo escáner usando html5-qrcode.
	 * Se llama al pulsar el botón "Escanear QR".
	 */
	function startScanner() {
		// Elementos del DOM necesarios
		if (!scannerVideoRegion || !scannerMessage || !scannerInputView || !adminScannerView || !adminMainView) {
			console.error("Faltan elementos del DOM para el escáner.");
			showInfoModal("Error interno al iniciar el escáner.", true);
			return;
		}

		// Ocultar vista principal, mostrar vista escáner
		adminMainView.classList.add('hidden');
		adminScannerView.classList.remove('hidden');

		// Asegurar que el modal de confirmación esté oculto
		scannerInputView.classList.add('hidden');

		// Limpiar mensajes y mostrar el visor de vídeo
		scannerMessage.innerHTML = "Iniciando cámara...";
		scannerMessage.className = "text-center text-gray-400 mt-4 h-12 flex items-center justify-center font-pixel text-lg";
		scannerVideoRegion.classList.remove('hidden');
		scannerVideoRegion.innerHTML = ''; // Limpiar por si acaso
		currentScannedTicketInfo = null; // Limpiar datos previos

		try {
			// 1. Crear la instancia del escáner
			// 'true' habilita el modo verboso (logs en consola, útil para debug)
			html5QrCodeScanner = new Html5Qrcode("scanner-video-region", true); // <-- MODIFICADO ID

			// 2. Configuración del escáner
			const config = {
				fps: 10, // Frames por segundo a escanear
				qrbox: { width: 250, height: 250 }, // Tamaño de la caja de escaneo (px)
				aspectRatio: 1.0, // Ratio de aspecto del vídeo (cuadrado)
				rememberLastUsedCamera: true, // Recordar cámara (trasera/frontal)
				supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] // Solo usar cámara
			};

			// 3. Funciones de callback
			const qrCodeSuccessCallback = (decodedText, decodedResult) => {
				// ¡Éxito! Código encontrado
				console.log(`Código encontrado: ${decodedText}`, decodedResult);
				stopScanner(true); // Detener el escáner (pero mantener la vista)
				handleScannedCode(decodedText); // Procesar el código
			};

			const qrCodeErrorCallback = (errorMessage) => {
				// Se llama en cada frame que NO encuentra un QR.
				// Lo ignoramos para no llenar la consola, excepto si es un error real.
				if (!errorMessage.includes("QR code not found")) {
					console.warn(`Error de escáner: ${errorMessage}`);
					// Opcional: Mostrar error leve al usuario si persiste
					// scannerMessage.innerHTML = "Apuntando a código QR...";
				}
			};

			// 4. Iniciar el escáner
			scannerMessage.innerHTML = "Apuntando a código QR...";
			html5QrCodeScanner.start(
				{ facingMode: "environment" }, // Pedir cámara trasera
				config,
				qrCodeSuccessCallback,
				qrCodeErrorCallback
			).catch(err => {
				// Error grave al iniciar la cámara
				console.error("Error al iniciar html5-qrcode scanner:", err);
				scannerMessage.innerHTML = "Error al iniciar la cámara. Revisa los permisos.";
				scannerMessage.className = "text-center text-red-400 mt-4 h-12 flex items-center justify-center font-pixel text-lg";
				html5QrCodeScanner = null; // Limpiar instancia si falla
			});

		} catch (e) {
			console.error("Excepción al crear html5QrCodeScanner:", e);
			scannerMessage.innerHTML = "Error crítico del escáner.";
			scannerMessage.className = "text-center text-red-400 mt-4 h-12 flex items-center justify-center font-pixel text-lg";
			html5QrCodeScanner = null;
		}
	}

	/**
	 * Detiene el escáner activo de html5-qrcode.
	 * @param {boolean} [keepScannerView=false] - Si es true, no oculta la vista del escáner (usado al encontrar QR).
	 */
	function stopScanner(keepScannerView = false) {
		if (html5QrCodeScanner) {
			try {
				// Comprobar estado antes de parar
				if (html5QrCodeScanner.getState() === Html5QrcodeScannerState.SCANNING) {
					html5QrCodeScanner.stop();
					console.log("Escáner html5-qrcode detenido.");
				}
			} catch (e) {
				console.warn("Error al detener html5-qrcode scanner (puede que ya estuviera parado):", e);
			} finally {
				html5QrCodeScanner = null; // Limpiar la instancia
			}
		}

		if (!keepScannerView) {
			// Ocultar vista escáner y mostrar vista admin principal
			adminScannerView?.classList.add('hidden');
			adminMainView?.classList.remove('hidden');

			// Limpiar el <div> por si el escáner no lo hizo
			if (scannerVideoRegion) scannerVideoRegion.innerHTML = ''; // <-- MODIFICADO
		}

		currentScannedTicketInfo = null; // Limpiar datos escaneados
	}

	/**
	 * Parsea el texto del QR para determinar tipo y extraer datos.
	 * (Esta función se mantiene igual que la tuya original)
	 */
	function parseQRData(qrText) {
		if (!qrText || typeof qrText !== 'string') return null;

		const lines = qrText.split('\n');
		const data = { qrType: 'Unknown' }; // Tipo por defecto

		// --- Patrón 1: Venta de Merch (Nuevo formato con ID) ---
		if (qrText.includes("MERCH_SALE_ID:")) {
			data.qrType = 'Merch_Sale';
			lines.forEach(line => {
				const parts = line.split(':');
				if (parts.length >= 2) {
					const key = parts[0].trim().toUpperCase().replace(/\s+/g, '_'); // Clave limpia y mayúsculas
					const value = parts.slice(1).join(':').trim(); // Valor (puede contener :)
					if (key === 'MERCH_SALE_ID' || key === 'NOMBRE' || key === 'EMAIL' || key === 'DRAG' || key === 'ITEM' || key === 'QTY') {
						data[key] = value;
					}
				}
			});
			// Validar que al menos tengamos el ID
			if (!data.MERCH_SALE_ID) return null;
			return data;
		}

		// --- Patrón 2: Entrada Simplificada (NUEVO: Solo TICKET_ID) ---
		if (qrText.includes("TICKET_ID:") && !qrText.includes("EVENTO:")) {
			const ticketIdMatch = qrText.match(/TICKET_ID:(.+)/i);
			if (ticketIdMatch && ticketIdMatch[1]) {
				data.qrType = 'Ticket_Simple';
				data.TICKET_ID = ticketIdMatch[1].trim();
				return data;
			}
		}

		// --- Patrón 3: Entrada Legacy (Antiguo, con todos los datos) ---
		if (qrText.includes("TICKET_ID:") && qrText.includes("EVENTO:")) {
			data.qrType = 'Ticket_Legacy'; // Renombrado de 'Ticket' a 'Ticket_Legacy'
			lines.forEach(line => {
				const parts = line.split(':');
				if (parts.length >= 2) {
					const key = parts[0].trim().toUpperCase().replace(/\s+/g, '_');
					const value = parts.slice(1).join(':').trim();
					if (key === 'TICKET_ID' || key === 'EVENTO' || key === 'FECHA' || key === 'NOMBRE' || key === 'EMAIL' || key === 'CANTIDAD') {
						data[key] = value;
					}
				}
			});
			// Validar ID y Cantidad
			if (!data.TICKET_ID || !data.CANTIDAD || isNaN(parseInt(data.CANTIDAD))) return null;
			return data;
		}

		// --- Patrón 4: Merch Legacy (Antiguo, solo informativo) - Marcar como legacy ---
		if (qrText.includes("MERCH_ITEM_ID:") && qrText.includes("DRAG:")) {
			data.qrType = 'Merch_Legacy'; // Marcar como antiguo/inválido
			return data;
		}

		// Si no coincide con ningún patrón conocido
		console.warn("QR Parse: Formato desconocido:", qrText.substring(0, 50) + '...');
		return null;
	}


	/**
			 * Maneja el código QR escaneado (basado en tu lógica original).
			 * Muestra mensajes o el modal de confirmación.
			 */
	function handleScannedCode(data) {
		const qrData = parseQRData(data);
		const restartDelay = 3000; // 3 segundos para reintentar tras error/éxito
		let msg = "";
		let isError = true;
		let requiresConfirmation = false; // Indica si se necesita el modal de input
		let vibrationPattern = [200, 100, 200]; // Patrón error por defecto

		// Elementos del DOM
		if (!scannerMessage || !scannerInputView || !scannerInputMessage || !scannerQuantityInput || !scannerVideoRegion) { // <-- MODIFICADO
			showInfoModal("Error interno del escáner (elementos no encontrados).", true);
			stopScanner(false); // Detener y salir de la vista escáner
			return;
		}

		scannerVideoRegion.classList.remove('hidden'); // Asegurar vista vídeo visible
		scannerInputView.classList.add('hidden'); // Ocultar input por defecto

		if (!qrData) {
			msg = "ERROR: CÓDIGO QR NO VÁLIDO O ILEGIBLE.";
		} else if (qrData.qrType === 'Merch_Legacy') {
			msg = `ERROR: QR DE MERCH ANTIGUO.<br>Usa el QR del pedido descargado.`;
		} else if (qrData.qrType === 'Merch_Sale') {
			// --- Lógica para QR de Venta de Merch ---
			const saleId = qrData.MERCH_SALE_ID;
			const sale = allMerchSales.find(s => s.saleId === saleId);

			if (!sale) {
				msg = `ERROR: PEDIDO MERCH NO ENCONTRADO.<br>(ID: ${saleIdShort(saleId)}...)`;
				console.warn("Scanner: Merch Sale ID no encontrado:", saleId);
			} else if (sale.status === 'Delivered') {
				msg = `AVISO: PEDIDO MERCH YA ENTREGADO.<br>(ID: ${saleIdShort(saleId)}...)`;
				isError = false; // No es un error, solo informativo
				vibrationPattern = [50, 50, 50]; // Vibración corta
			} else {
				// --- ÉXITO MERCH PENDIENTE ---
				isError = false;
				requiresConfirmation = true;
				currentScannedTicketInfo = { qrData, sale }; // Guardar datos
				const buyerName = qrData.NOMBRE || `${sale.nombre || ''} ${sale.apellidos || ''}`.trim() || 'Nombre N/A';

				// Configurar modal de confirmación
				scannerQuantityInput.value = sale.quantity || 1;
				scannerQuantityInput.disabled = true; // No editable
				scannerQuantityInput.max = sale.quantity || 1;
				scannerQuantityInput.min = sale.quantity || 1;

				scannerInputMessage.innerHTML = `
						<span class="text-3xl text-yellow-400">¡PEDIDO MERCH PENDIENTE!</span>
						<span class="text-xl text-white mt-2">${buyerName}</span>
						<span class="text-lg text-white mt-1">DRAG: ${sale.dragName || '?'}</span>
						<span class="text-lg text-white">ARTÍCULO: ${sale.itemName || '?'}</span>
						<span class="text-xl text-white">CANTIDAD: ${sale.quantity || '?'}</span>
						<span class="text-sm text-gray-400 mt-2">EMAIL: ${sale.email || '?'}</span>`;
				if (scannerConfirmBtn) scannerConfirmBtn.textContent = 'CONFIRMAR ENTREGA';
				vibrationPattern = [100, 50, 100, 50, 100]; // Éxito
			}

		} else if (qrData.qrType === 'Ticket_Legacy' || qrData.qrType === 'Ticket_Simple') {
			// --- Lógica para QR de Entrada (Legacy o Simple) ---
			const ticketId = qrData.TICKET_ID;
			const ticketEntry = allTickets.find(t => t.ticketId === ticketId);
			const event = appState.events.find(e => e.id === ticketEntry?.eventId);
			const usedCount = appState.scannedTickets[ticketId] || 0;
			const available = (ticketEntry?.quantity || 0) - usedCount;
			const holderName = `${ticketEntry?.nombre || ''} ${ticketEntry?.apellidos || ''}`.trim() || 'Nombre N/A';

			if (!ticketEntry || !event) {
				msg = `ERROR: ENTRADA NO ENCONTRADA.<br>(ID: ${saleIdShort(ticketId)}...)`;
				console.warn("Scanner: Ticket ID o Evento no encontrado:", ticketId);
			} else if (available <= 0) {
				msg = `ERROR: ENTRADA AGOTADA.<br>Usadas: ${usedCount}/${ticketEntry.quantity}`;
			} else if (event.isArchived) {
				msg = `ERROR: EVENTO ARCHIVADO.<br>(${event.name || '?'})`;
			}
			else {
				// --- ÉXITO TICKET VÁLIDO ---
				isError = false;
				requiresConfirmation = true;
				currentScannedTicketInfo = { qrData, ticketEntry, event, available };

				// Configurar modal de confirmación
				scannerQuantityInput.value = 1; // Default 1
				scannerQuantityInput.max = available; // Máximo disponibles
				scannerQuantityInput.min = 1; // Mínimo 1
				scannerQuantityInput.disabled = false; // Editable

				scannerInputMessage.innerHTML = `
						<span class="text-3xl text-green-400">¡ENTRADA VÁLIDA!</span>
						<span class="text-xl text-white mt-2">${holderName}</span>
						<span class="text-lg text-white mt-1">EVENTO: ${event.name || '?'}</span>
						<span class="text-lg text-white">EMAIL: ${ticketEntry.email || '?'}</span>
						<span class="text-xl text-white mt-1">TOTAL: ${ticketEntry.quantity || '?'} | USADAS: ${usedCount} | DISPO: ${available}</span>`;
				if (scannerConfirmBtn) scannerConfirmBtn.textContent = 'CONFIRMAR ENTRADA';
				vibrationPattern = [100, 50, 100, 50, 100];
			}
		} else {
			msg = "ERROR: CÓDIGO QR DESCONOCIDO.";
		}

		// --- Mostrar Resultado ---
		navigator.vibrate?.(vibrationPattern); // Vibrar

		if (requiresConfirmation) {
			// Ocultar vídeo y mostrar modal de confirmación
			scannerVideoRegion.classList.add('hidden'); // <-- MODIFICADO
			// Limpiar el div del vídeo para que la cámara se apague (importante)
			scannerVideoRegion.innerHTML = ''; // <-- MODIFICADO
			scannerInputView.classList.remove('hidden');
			// El flujo continúa en handleScannerConfirm / handleScannerCancel
		} else {
			// Mostrar mensaje de error o aviso y reiniciar scanner
			currentScannedTicketInfo = null; // Limpiar datos
			scannerMessage.innerHTML = msg;
			scannerMessage.className = `text-center ${isError ? 'text-red-400' : 'text-yellow-400'} mt-4 h-auto flex items-center justify-center font-pixel text-lg leading-tight`;
			scannerVideoRegion.classList.remove('hidden'); // <-- MODIFICADO
			scannerInputView.classList.add('hidden'); // Ocultar input

			// Reiniciar el escáner (la instancia ya se paró, hay que crear una nueva)
			setTimeout(startScanner, restartDelay);
		}
	}


	/**
	 * Confirma el uso/entrega y guarda el estado (basado en tu lógica original).
	 * MODIFICADO: Llama a startScanner() o stopScanner(false) al finalizar.
	 */
	async function handleScannerConfirm() {
		if (!currentScannedTicketInfo) return; // No hay nada que confirmar
		const { qrData } = currentScannedTicketInfo;

		// Callback para ejecutar al cerrar el modal de info (éxito o error)
		let afterSaveCallback = () => startScanner(); // Por defecto, reiniciar escáner

		showLoading(true); // Mostrar loading

		try {
			if (qrData.qrType === 'Merch_Sale') {
				// --- Confirmar Entrega Merch ---
				const { sale } = currentScannedTicketInfo;
				const saleId = sale.saleId;
				const saleIndex = allMerchSales.findIndex(s => s.saleId === saleId);

				if (saleIndex > -1 && allMerchSales[saleIndex].status === 'Pending') {
					allMerchSales[saleIndex].status = 'Delivered';
					await saveMerchSalesState(); // Guardar ventas

					if (!adminPages['merch']?.classList.contains('hidden') && currentAdminMerchDragId === sale.dragId) {
						renderAdminMerchSalesSummary();
					}
					showInfoModal(`¡PEDIDO MERCH CONFIRMADO!<br>${sale.itemName || '?'} x ${sale.quantity || '?'} entregado.`, false, afterSaveCallback);
				} else {
					throw new Error("Pedido no encontrado o ya entregado.");
				}

			} else if (qrData.qrType === 'Ticket_Legacy' || qrData.qrType === 'Ticket_Simple') {
				// --- Confirmar Uso Ticket ---
				const { ticketEntry, available } = currentScannedTicketInfo;
				const quantityToUse = parseInt(scannerQuantityInput.value, 10);

				if (isNaN(quantityToUse) || quantityToUse <= 0 || quantityToUse > available) {
					throw new Error("Cantidad inválida para confirmar.");
				}

				const ticketId = ticketEntry.ticketId;
				if (!appState.scannedTickets) appState.scannedTickets = {};
				appState.scannedTickets[ticketId] = (appState.scannedTickets[ticketId] || 0) + quantityToUse;

				await saveAppState(); // Guardar appState (scannedTickets)

				renderAdminEvents(currentEvents); // Actualizar UI admin

				const remaining = available - quantityToUse;
				showInfoModal(`¡ENTRADA(S) CONFIRMADA(S)!<br>Usadas: ${quantityToUse}. Restantes: ${remaining}.`, false, afterSaveCallback);

			} else {
				throw new Error("Tipo de QR desconocido en confirmación.");
			}

		} catch (error) {
			console.error("Error confirming scan:", error);
			// Mostrar error y reiniciar scanner
			showInfoModal(`ERROR AL CONFIRMAR: ${error.message}`, true, afterSaveCallback);
		} finally {
			currentScannedTicketInfo = null; // Limpiar estado
			scannerInputView?.classList.add('hidden'); // Ocultar modal confirmación
			showLoading(false); // Ocultar loading
			// El callback de showInfoModal se encarga de reiniciar el escáner
		}
	}


	/**
	 * Cancela la confirmación y reinicia el escáner.
	 */
	function handleScannerCancel() {
		currentScannedTicketInfo = null; // Limpiar datos
		// Ocultar input view y mostrar video view
		scannerInputView?.classList.add('hidden');
		// El <div> 'scanner-video-region' debería estar vacío
		if (scannerVideoRegion) { // <-- MODIFICADO
			scannerVideoRegion.innerHTML = '';
			scannerVideoRegion.classList.remove('hidden');
		}

		startScanner(); // Reiniciar cámara y búsqueda
	}

	// Cargar referencias a las páginas del DOM
	document.querySelectorAll('[data-page]').forEach(el => pages[el.dataset.page] = el);
	document.querySelectorAll('[data-admin-page]').forEach(el => adminPages[el.dataset.adminPage] = el);
	document.querySelectorAll('[data-admin-nav]').forEach(el => adminNavLinks[el.dataset.adminNav] = el);
	document.querySelectorAll('#mobile-menu a[data-nav]').forEach(el => mobileNavLinks[el.dataset.nav] = el);

	// Listener de navegación principal, móvil y secundario
	document.querySelectorAll('[data-nav]').forEach(link => {
		addTrackedListener(link, 'click', (e) => {
			e.preventDefault();
			const navTarget = e.currentTarget.dataset.nav;
			showPage(navTarget); // showPage maneja la lógica de admin/login
		});
	});

	// Listener para el logo (vuelve a home)
	const logoBtn = document.getElementById('logo-btn');
	if (logoBtn) {
		addTrackedListener(logoBtn, 'click', (e) => { e.preventDefault(); showPage('home'); });
	}

	// Listener botón "Ver todos los eventos"
	if (viewAllEventsBtn) {
		addTrackedListener(viewAllEventsBtn, 'click', (e) => { e.preventDefault(); showPage('events'); });
	}


	// Listener de navegación de admin (pestañas internas)
	document.querySelectorAll('[data-admin-nav]').forEach(link => {
		addTrackedListener(link, 'click', (e) => {
			e.preventDefault();
			if (!isLoggedIn) return; // No hacer nada si no está logueado
			showAdminPage(e.currentTarget.dataset.adminNav);
		});
	});

	// Listeners Formularios Admin (Eventos, Drags, Merch Items)
	if (addEventForm) addTrackedListener(addEventForm, 'submit', handleSaveEvent);
	if (clearEventFormButton) addTrackedListener(clearEventFormButton, 'click', resetEventForm);
	if (addDragForm) addTrackedListener(addDragForm, 'submit', handleSaveDrag);
	if (clearDragFormButton) addTrackedListener(clearDragFormButton, 'click', resetDragForm);
	if (addMerchItemForm) addTrackedListener(addMerchItemForm, 'submit', handleSaveMerchItem);
	if (clearMerchItemFormButton) addTrackedListener(clearMerchItemFormButton, 'click', resetMerchItemForm);

	// Listeners Modales Generales y Navegación Imágenes
	document.querySelectorAll('[data-close-modal]').forEach(btn => {
		addTrackedListener(btn, 'click', (e) => closeModal(e.currentTarget.dataset.closeModal));
	});
	if (imageModalPrevBtn) addTrackedListener(imageModalPrevBtn, 'click', (e) => { e.stopPropagation(); handleImageModalPrev(); });
	if (imageModalNextBtn) addTrackedListener(imageModalNextBtn, 'click', (e) => { e.stopPropagation(); handleImageModalNext(); });

	// Listeners Merch Público (Formulario compra, botón descarga QR)
	if (merchPurchaseForm) addTrackedListener(merchPurchaseForm, 'submit', handleMerchPurchaseSubmit);
	if (downloadMerchQrBtn) addTrackedListener(downloadMerchQrBtn, 'click', handleDownloadMerchQr);

	// Listeners Admin Merch (Select drag, botón ver lista ventas)
	if (adminMerchSelectDrag) addTrackedListener(adminMerchSelectDrag, 'change', handleAdminMerchDragSelect);
	if (adminMerchViewSalesBtn) addTrackedListener(adminMerchViewSalesBtn, 'click', handleViewMerchSales);

	// Listeners Subida de Archivos
	if (contentManageForm) addTrackedListener(contentManageForm, 'submit', handleSaveContent);
	if (eventPosterUploadInput && eventPosterUrlInput) addTrackedListener(eventPosterUploadInput, 'change', (e) => handleFileUpload(e, eventPosterUrlInput));
	if (appLogoUploadInput && appLogoUrlInput) addTrackedListener(appLogoUploadInput, 'change', (e) => handleFileUpload(e, appLogoUrlInput));
	if (ticketLogoUploadInput && ticketLogoUrlInput) addTrackedListener(ticketLogoUploadInput, 'change', (e) => handleFileUpload(e, ticketLogoUrlInput));
	if (bannerUploadInput && bannerUrlInput) addTrackedListener(bannerUploadInput, 'change', (e) => handleFileUpload(e, bannerUrlInput));
	if (galleryUploadInput) addTrackedListener(galleryUploadInput, 'change', (e) => handleMultipleFileUpload(e, 'gallery-urls-input', 'admin-gallery-preview-grid')); // <-- MODIFICADO
	if (dragCoverUploadInput && dragCoverUrlInput) addTrackedListener(dragCoverUploadInput, 'change', (e) => handleFileUpload(e, dragCoverUrlInput));
	if (dragGalleryUploadInput) addTrackedListener(dragGalleryUploadInput, 'change', (e) => handleMultipleFileUpload(e, 'drag-gallery-urls', 'admin-drag-gallery-preview-grid')); // <-- MODIFICADO
	// Los botones para forzar subida ya no son necesarios si se sube al seleccionar
	if (merchItemImageUploadInput && merchItemImageUrlInput) addTrackedListener(merchItemImageUploadInput, 'change', (e) => handleFileUpload(e, merchItemImageUrlInput));

	// ========== NUEVO: Listeners para Web Merch System ==========
	if (addWebMerchBtn) addTrackedListener(addWebMerchBtn, 'click', () => showWebMerchForm());
	if (webMerchForm) addTrackedListener(webMerchForm, 'submit', handleSaveWebMerch);
	if (cancelWebMerchBtn) addTrackedListener(cancelWebMerchBtn, 'click', () => hideWebMerchForm());
	if (webMerchImageUploadInput && webMerchImageUrlInput) addTrackedListener(webMerchImageUploadInput, 'change', (e) => handleFileUpload(e, webMerchImageUrlInput));
	if (webMerchViewSalesBtn) addTrackedListener(webMerchViewSalesBtn, 'click', handleViewWebMerchSales);

	// ========== NUEVO: Listeners para Drag Merch System ==========
	if (dragMerchSelectDrag) addTrackedListener(dragMerchSelectDrag, 'change', handleDragMerchSelectChange);
	if (addDragMerchBtn) addTrackedListener(addDragMerchBtn, 'click', () => showDragMerchForm()); // NUEVO
	if (dragMerchForm) addTrackedListener(dragMerchForm, 'submit', handleSaveDragMerch);
	if (cancelDragMerchBtn) addTrackedListener(cancelDragMerchBtn, 'click', () => hideDragMerchForm());
	if (dragMerchImageUploadInput && dragMerchImageUrlInput) addTrackedListener(dragMerchImageUploadInput, 'change', (e) => handleFileUpload(e, dragMerchImageUrlInput));
	if (dragMerchViewSalesBtn) addTrackedListener(dragMerchViewSalesBtn, 'click', handleViewDragMerchSales);

	// SMTP System
	if (smtpConfigForm) addTrackedListener(smtpConfigForm, 'submit', handleSaveSMTPConfig);
	if (testSMTPBtn) addTrackedListener(testSMTPBtn, 'click', testSMTPConnection);
	if (dragEmailSelect) addTrackedListener(dragEmailSelect, 'change', handleDragEmailSelect);
	if (saveDragEmailConfigBtn) addTrackedListener(saveDragEmailConfigBtn, 'click', handleSaveDragEmailConfig);
	if (saveWebMerchConfigBtn) addTrackedListener(saveWebMerchConfigBtn, 'click', saveEmailNotificationsState); // NUEVO
	if (saveWebMerchConfigBtn) addTrackedListener(saveWebMerchConfigBtn, 'click', saveEmailNotificationsState); // NUEVO
	// ========== FIN NUEVO ==========


	// Listeners Admin Galerías y Backup/Restore
	if (galleryManageForm) addTrackedListener(galleryManageForm, 'submit', handleSaveGallery);
	if (galleryEventSelect) addTrackedListener(galleryEventSelect, 'change', handleGalleryEventSelect);
	if (galleryBackBtn) addTrackedListener(galleryBackBtn, 'click', (e) => { e.preventDefault(); renderGalleryEventList(); }); // Volver a lista galerías
	if (dragGalleryBackBtn) addTrackedListener(dragGalleryBackBtn, 'click', (e) => { e.preventDefault(); renderDragList(); }); // Volver a lista drags
	if (backupBtn) addTrackedListener(backupBtn, 'click', handleBackup);
	if (restoreInput) addTrackedListener(restoreInput, 'change', handleRestore);

	// Listeners Ticketing Público (Form email, botón descarga ticket)
	if (emailForm) addTrackedListener(emailForm, 'submit', handleEmailSubmit);
	if (downloadTicketBtn) addTrackedListener(downloadTicketBtn, 'click', handleDownloadTicket);

	// Listeners Escáner QR (Actualizado para html5-qrcode)
	if (scanQrBtn) addTrackedListener(scanQrBtn, 'click', (e) => {
		e.preventDefault();
		startScanner(); // La función startScanner ya maneja el cambio de vistas
	});
	if (scanBackBtn) addTrackedListener(scanBackBtn, 'click', (e) => {
		e.preventDefault();
		stopScanner(false); // La función stopScanner(false) ya maneja el regreso a la vista principal
	});
	if (scannerConfirmBtn) addTrackedListener(scannerConfirmBtn, 'click', handleScannerConfirm);
	if (scannerCancelBtn) addTrackedListener(scannerCancelBtn, 'click', handleScannerCancel);

	// --- NUEVO LISTENER AÑADIDO ---
	if (scannerCloseBtn) addTrackedListener(scannerCloseBtn, 'click', (e) => {
		e.preventDefault();
		// Cierra el scanner completamente y vuelve al panel, igual que el botón "Atrás"
		stopScanner(false);
	});
	// --- FIN NUEVO LISTENER ---

	// Listeners Auth (Login, Logout, Menú Móvil para Easter Egg)
	if (loginForm) addTrackedListener(loginForm, 'submit', handleAdminLogin);
	if (logoutBtn) addTrackedListener(logoutBtn, 'click', () => handleLogout(true)); // Mostrar modal éxito por defecto
	if (mobileMenuBtn) addTrackedListener(mobileMenuBtn, 'click', (e) => {
		e.preventDefault();
		handleAdminMenuTap(); // Intentar revelar link Admin (Easter Egg)
		mobileMenu?.classList.toggle('hidden'); // Siempre abrir/cerrar menú
	});

	// --- Inicialización Final ---
	checkAdminUI(); // Establecer UI correcta (login/panel) basado en estado inicial
	renderAppLogo(); // Renderizar logo inicial
	renderNextEventPromo(); // Renderizar promo inicial
	showPage('home'); // Mostrar página de inicio por defecto
}); // Fin DOMContentLoaded
