(function($) {
    "use strict"; // Start of use strict

    // Smooth scrolling using jQuery easing
    $('a[href*="#"]:not([href="#"]):not([class="dropdown-item"]):not(".xng-route")').click(function() {
        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
            var target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
            if (target.length) {
                $('html, body').animate({
                    scrollTop: (target.offset().top - 48)
                }, 1000, "easeInOutExpo");
                return false;
            }
        }
    });

    // Activate scrollspy to add active class to navbar items on scroll
    $('body').scrollspy({
        target: '#mainNav',
        offset: 48
    });

    // Closes responsive menu when a link is clicked
    $('.navbar-collapse>ul>li>a').click(function() {
        $('.navbar-collapse').collapse('hide');
    });

    // Collapse the navbar when page is scrolled
    $(window).scroll(function() {
        $("nav.navbar.fixed-top").each(function() {
            var nav = $(this);
			// var nav = $("#mainNav");
			if (nav.offset().top > 100) {
				nav.addClass("navbar-shrink");
			} else {
				nav.removeClass("navbar-shrink");
			}
        });
    });

    var top_offset = 50;
	var scrollTop = function () {
		if ($(document).scrollTop() > top_offset) {
			$('.scroll-top').stop().fadeIn();
		} else {
			$('.scroll-top').stop().fadeOut();
		}
	};
	$(window).bind('scroll', scrollTop);
	$(window).bind('resize', scrollTop);
	scrollTop();

    // Scroll reveal calls
    window.sr = ScrollReveal();
    sr.reveal('.sr-icons', {
        duration: 600,
        scale: 0.3,
        distance: '0px'
    }, 200);
    sr.reveal('.sr-button', {
        duration: 1000,
        delay: 200
    });
    sr.reveal('.sr-contact', {
        duration: 600,
        scale: 0.3,
        distance: '0px'
    }, 300);

})(jQuery); // End of use strict
