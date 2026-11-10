// 네비게이션 사이드바 열고 닫기
$(document).ready(function () {
    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggleClass('active');
    });
});

// Dropdown
$('.dropdown-toggle').dropdown()

// Datetime Picker js
$('.datepicker').datetimepicker({
    format: 'YYYY.MM.DD',
    locale: 'ko'
});
$(".monthpicker").datetimepicker({
    format: 'YYYY.MM',
    locale: 'ko'
});
$(".timepicker").datetimepicker({
    format: 'h:mm a',
    locale: 'ko'
});
$(".yearpicker").datetimepicker({
    format: 'YYYY',
    locale: 'ko'
});

// GIS 내부 슬라이드 기능
$(document).ready(function () {
    $(".flip-btn").click(function () {
        $("#flip").slideToggle("slow");
    });
});


// Treeview 트리뷰 기능
$.fn.extend({
    treed: function (o) {

        var openedClass = 'fa-folder-minus';
        var closedClass = 'fa-folder-plus';

        if (typeof o != 'undefined') {
            if (typeof o.openedClass != 'undefined') {
                openedClass = o.openedClass;
            }
            if (typeof o.closedClass != 'undefined') {
                closedClass = o.closedClass;
            }
        };

        //initialize each of the top levels
        var tree = $(this);
        tree.addClass("tree");
        tree.find('li').has("ul").each(function () {
            var branch = $(this); //li with children ul
            branch.prepend("<i class='indicator far " + closedClass + "'></i>");
            branch.addClass('branch');
            branch.on('click', function (e) {
                if (this == e.target) {
                    var icon = $(this).children('i:first');
                    icon.toggleClass(openedClass + " " + closedClass);
                    $(this).children().children().toggle();
                }
            })
            branch.children().children().toggle();
        });
        //fire event from the dynamically added icon
        tree.find('.branch .indicator').each(function () {
            $(this).on('click', function () {
                $(this).closest('li').click();
            });
        });
        //fire event to open branch if the li contains an anchor instead of text
        tree.find('.branch>a').each(function () {
            $(this).on('click', function (e) {
                $(this).closest('li').click();
                e.preventDefault();
            });
        });
        //fire event to open branch if the li contains a button instead of text
        tree.find('.branch>button').each(function () {
            $(this).on('click', function (e) {
                $(this).closest('li').click();
                e.preventDefault();
            });
        });
    }
});

$('#treeview').treed();
//end


// Form 필수요소 입력폼 규칙 
// Example starter JavaScript for disabling form submissions if there are invalid fields
(function () {
    'use strict';
    window.addEventListener('load', function () {
        // Fetch all the forms we want to apply custom Bootstrap validation styles to
        var forms = document.getElementsByClassName('needs-validation');
        // Loop over them and prevent submission
        var validation = Array.prototype.filter.call(forms, function (form) {
            form.addEventListener('submit', function (event) {
                if (form.checkValidity() === false) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            }, false);
        });
    }, false);
})();

// Form 이미지 파일 드래그하여 끌어오기
function readURL(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            $('#drop-img')
                .attr('src', e.target.result);
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// jQgrid Modal안에서 불러오기
$('.modal').on('shown.bs.modal', function (event) {
    fn_clearConfigGrid();
});

// Tooltip
$(function () {
    $('[data-toggle="tooltip"]').tooltip()
})
