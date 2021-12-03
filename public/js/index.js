/* eslint-disable */
import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout } from './login';

// DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');

// DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations); // map is the css id we specified, whatever we put in data attribute lik data-locations(in tour.pug file) and will be called dataset.locations because it is uses as data/locations or data-locations
  // console.log(locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // this prevents the form from loading any other page
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value; // it gets the email and password value
    login(email, password);
  });
}

if (logOutBtn) logOutBtn.addEventListener('click', logout); // whenever the log Out button is clicked we want to listen to it and then logout the user
