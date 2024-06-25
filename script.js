const tabs = document.querySelectorAll('[data-tab-target]')
const tabContents = document.querySelectorAll('[data-tab-content]')

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = document.querySelector(tab.dataset.tabTarget)
        tabContents.forEach(tabContent => {tabContent.classList.remove('active')})
        tabs.forEach(tab => {tab.classList.remove('active')})
        tab.classList.add('active')
        target.classList.add('active')
    })
})

var $window = $(window),
  window_height = $window.height() - 150, // I'm using 150 (a random number) so the image appears 150px after it enters the screen, so the effect can be appreciated
  $img = $('img.image'),
  img_loaded = false,
  img_top = $img.offset().top;

$window.on('scroll', function() {

  if (($window.scrollTop() + window_height) > img_top && img_loaded == false) {

    $img.attr('src', $img.attr('image/ProfessionalPicture1.png'));

  }

});