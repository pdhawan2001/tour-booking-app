/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';
const stripe = Stripe(
  'pk_test_51K6DPRSGafvRGKQ4132to9vhgiWPGGLsLNIV5gbhTtCmIlSBM47UDUKMzG16IlTFN0eSGRiO0ogFFV7bDImJ9UKL00lFbSf9l6'
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checokout session from API
    const session = await axios(
      `/api/v1/bookings/checkout-session/${tourId}`
    ); // only pass the url when it is a 'GET' request
    console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
