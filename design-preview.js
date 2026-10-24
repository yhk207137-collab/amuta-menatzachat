/* Design preview only: no network calls and no registration is sent. */
(()=>{
 const form=document.querySelector('[data-form]');
 form.addEventListener('submit',e=>{e.preventDefault();const message=form.querySelector('[data-error]');message.textContent='זו תצוגת עיצוב בלבד. ההרשמה מתבצעת בדף הפעיל.';message.hidden=false;});
 const sticky=document.querySelector('[data-sticky]');
 new IntersectionObserver(([entry])=>sticky.classList.toggle('on',!entry.isIntersecting&&entry.boundingClientRect.top<0)).observe(document.getElementById('join'));
})();
