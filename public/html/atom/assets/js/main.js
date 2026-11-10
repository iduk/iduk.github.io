// Main JS
$(document).ready(function () {
	// Select2
	$("select").each(function () {
		$(this).select2({
			theme: "bootstrap4",
			width: "100%",
			placeholder: $(this).attr("placeholder"),
			allowClear: Boolean($(this).data("allow-clear"))
		});
	});

	// Wow.js
	new WOW().init();

	// Theme Colors Change
	$("main#sub").addClass(function () {
		$(".logoImg").attr("src", "../assets/images/atom-logo.svg");
		$("#topNav")
			.removeClass("navbar-dark")
			.addClass("navbar-light");
	});

	// Navbar - Scrolled
	$(window).scroll(function () {
		var navHeight = $("#topNav").outerHeight();
		$("#topNav").toggleClass("scrolled", $(this).scrollTop() > navHeight);
	});

	// Navbar - Toggle / noscroll
	$(".navbar-toggler").click(function () {
		$(".navbar-collapse").toggleClass("open");
		$(this)
			.children()
			.first()
			.toggleClass("open");
		$("html, body").toggleClass("lockscreen");
	});

	// Modernizr SVG
	if (!Modernizr.svg) {
		$("img[src$='.svg']").attr("src", fallback);
	}

	// fancybox - images 
	$('[data-fancybox="images"]').fancybox({
		toolbar: false,
		touch: true,
		smallBtn: true,
		afterLoad: function (instance, current) {
			var pixelRatio = window.devicePixelRatio || 1;

			if (pixelRatio > 1.5) {
				current.width = current.width / pixelRatio;
				current.height = current.height / pixelRatio;
			}
		}
	});
	// fancybox - license
	$('[data-fancybox="license"]').fancybox({
		slideClass: 'license',
		toolbar: false,
		touch: true,
		smallBtn: true
	});


	// carousel - business page
	$('#slide-business').carousel({
		interval: 3000
	});


	// select2
	$('select').select2({
		theme: 'bootstrap4'
	});
	$("#dropdown").select2({
		theme: "bootstrap"
	});
});
