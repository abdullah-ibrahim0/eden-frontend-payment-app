import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import {
  getLocale,
  FormattedMessage,
  injectIntl,
  intlShape,
} from '@edx/frontend-platform/i18n';
import { sendTrackEvent } from '@edx/frontend-platform/analytics';

import messages from './Checkout.messages';
import {
  basketSelector,
  paymentSelector,
  updateClientSecretSelector,
} from '../data/selectors';
import { fetchClientSecret, submitPayment } from '../data/actions';
import AcceptedCardLogos from './assets/accepted-card-logos.png';

import PaymentForm from './payment-form/PaymentForm';
import StripePaymentForm from './payment-form/StripePaymentForm';
import FreeCheckoutOrderButton from './FreeCheckoutOrderButton';
import { PayPalButton } from '../payment-methods/paypal';
import { ORDER_TYPES } from '../data/constants';

class Checkout extends React.Component {
  componentDidMount() {
    this.props.fetchClientSecret();
    // Debug: Log fetched client secret
    console.log('Client Secret Fetched:', this.props.clientSecretId);
  }

  handleSubmitPayPal = () => {
    sendTrackEvent(
      'edx.bi.ecommerce.basket.payment_selected',
      {
        type: 'click',
        category: 'checkout',
        paymentMethod: 'PayPal',
        stripeEnabled: this.props.enableStripePaymentProcessor,
      },
    );
    this.props.submitPayment({ method: 'paypal' });
  };

  handleSubmitApplePay = () => {
    sendTrackEvent(
      'edx.bi.ecommerce.basket.payment_selected',
      {
        type: 'click',
        category: 'checkout',
        paymentMethod: 'Apple Pay',
        stripeEnabled: this.props.enableStripePaymentProcessor,
      },
    );
    this.props.submitPayment({ method: 'apple-pay' });
  };

  handleSubmitCybersource = (formData) => {
    this.props.submitPayment({ method: 'cybersource', ...formData });
  };

  handleSubmitCybersourceButtonClick = () => {
    sendTrackEvent(
      'edx.bi.ecommerce.basket.payment_selected',
      {
        type: 'click',
        category: 'checkout',
        paymentMethod: 'Credit Card',
        checkoutType: 'client_side',
        flexMicroformEnabled: true,
        stripeEnabled: this.props.enableStripePaymentProcessor,
      },
    );
  };

  handleSubmitStripe = (formData) => {
    this.props.submitPayment({ method: 'stripe', ...formData });
  };

  handleSubmitStripeButtonClick = () => {
    sendTrackEvent(
      'edx.bi.ecommerce.basket.payment_selected',
      {
        type: 'click',
        category: 'checkout',
        paymentMethod: 'Credit Card - Stripe',
        checkoutType: 'client_side',
        stripeEnabled: this.props.enableStripePaymentProcessor,
      },
    );
  };

  handleSubmitFreeCheckout = () => {
    sendTrackEvent(
      'edx.bi.ecommerce.basket.free_checkout',
      { type: 'click', category: 'checkout', stripeEnabled: this.props.enableStripePaymentProcessor },
    );
  };

  renderBillingFormSkeleton() {
    return (
      <>
        <div className="skeleton py-1 mb-3 w-25" />
        <div className="row">
          <div className="col-lg-6">
            <div className="skeleton py-3 mb-3" />
            <div className="skeleton py-3 mb-3" />
            <div className="skeleton py-3 mb-3" />
            <div className="skeleton py-3 mb-3" />
          </div>
          <div className="col-lg-6">
            <div className="skeleton py-3 mb-3" />
            <div className="skeleton py-3 mb-3" />
            <div className="skeleton py-3 mb-3" />
            <div className="skeleton py-3 mb-3" />
          </div>
        </div>
        <div className="skeleton py-1 mb-3 mt-5 w-25" />
        <div className="row">
          <div className="col-lg-6">
            <div className="skeleton py-3 mb-3" />
          </div>
          <div className="col-lg-6">
            <div className="skeleton py-3 mb-3" />
          </div>
        </div>
      </>
    );
  }

  renderCheckoutOptions() {
    const {
      enableStripePaymentProcessor,
      intl,
      isFreeBasket,
      isBasketProcessing,
      loading,
      loaded,
      paymentMethod,
      submitting,
      orderType,
    } = this.props;
    const submissionDisabled = loading || isBasketProcessing;
    const isBulkOrder = orderType === ORDER_TYPES.BULK_ENROLLMENT;
    const isQuantityUpdating = isBasketProcessing && loaded;

    // Stripe element config
    const options = {
      clientSecret: this.props.clientSecretId,
      appearance: {
        rules: {
          '.Input': {
            border: 'solid 1px #707070',
            borderRadius: '0',
          },
          '.Input:hover': {
            border: 'solid 1px #1f3226',
          },
          '.Input:focus': {
            color: '#454545',
            backgroundColor: '#FFFFFF',
            borderColor: '#0A3055',
            outline: '0',
            boxShadow: '0 0 0 1px #0A3055',
          },
          '.Label': {
            fontSize: '1.125rem',
            fontFamily: 'Inter,Helvetica Neue,Arial,sans-serif',
            fontWeight: '400',
            marginBottom: '0.5rem',
          },
        },
      },
      fields: {
        billingDetails: {
          address: 'never',
        },
      },
    };

    // Debug: Hardcoded values to ensure Stripe form rendering
    const shouldDisplayStripePaymentForm = true;
    const shouldDisplayCyberSourcePaymentForm = true;

    // Debug: Log shouldDisplayStripePaymentForm value
    console.log('shouldDisplayStripePaymentForm:', shouldDisplayStripePaymentForm);

    let stripePromise;
    if (shouldDisplayStripePaymentForm) {
      stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY, {
        betas: [process.env.STRIPE_BETA_FLAG],
        apiVersion: process.env.STRIPE_API_VERSION,
        locale: getLocale(),
      });
      // Debug: Log stripePromise
      console.log('stripePromise:', stripePromise);
    }

    if (isFreeBasket) {
      return (
        <FreeCheckoutOrderButton
          onClick={this.handleSubmitFreeCheckout}
        />
      );
    }

    const basketClassName = 'basket-section';

    return (
      <>
        <div className={basketClassName}>
          <h5 aria-level="2">
            <FormattedMessage
              id="payment.select.payment.method.heading"
              defaultMessage="Select Payment Method"
              description="The heading for the payment type selection section"
            />
          </h5>

          <p className="d-flex flex-wrap">
            <button type="button" className="payment-method-button active">
              <img
                src={AcceptedCardLogos}
                alt={intl.formatMessage(messages['payment.page.method.type.credit'])}
              />
            </button>

            <PayPalButton
              onClick={this.handleSubmitPayPal}
              className={classNames('payment-method-button', { 'skeleton-pulse': loading })}
              disabled={submissionDisabled}
              isProcessing={submitting && paymentMethod === 'paypal'}
              data-testid="PayPalButton"
            />
          </p>
        </div>

        {shouldDisplayStripePaymentForm ? (
          <Elements options={options} stripe={stripePromise}>
            <StripePaymentForm
              options={options}
              onSubmitPayment={this.handleSubmitStripe}
            />
          </Elements>
        ) : (
          <PaymentForm
            onSubmitPayment={this.handleSubmitCybersource}
            onSubmitButtonClick={this.handleSubmitCybersourceButtonClick}
            isProcessing={submitting && paymentMethod === 'cybersource'}
          />
        )}
      </>
    );
  }

  render() {
    const { loading, intl } = this.props;

    if (loading) {
      return this.renderBillingFormSkeleton();
    }

    return (
      <div className="checkout">
        <div className="checkout-wrapper container">
          <div className="checkout-main row">
            <div className="col-lg-8">
              {this.renderCheckoutOptions()}
            </div>
            <div className="col-lg-4">
              <div className="order-summary">
                <h5 aria-level="2">
                  <FormattedMessage
                    id="payment.order.summary.heading"
                    defaultMessage="Order Summary"
                    description="The heading for the order summary section"
                  />
                </h5>
                {/* ... Other order summary details ... */}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

Checkout.propTypes = {
  clientSecretId: PropTypes.string.isRequired,
  enableStripePaymentProcessor: PropTypes.bool.isRequired,
  fetchClientSecret: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
  isFreeBasket: PropTypes.bool.isRequired,
  isBasketProcessing: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  loaded: PropTypes.bool.isRequired,
  paymentMethod: PropTypes.string,
  submitting: PropTypes.bool.isRequired,
  submitPayment: PropTypes.func.isRequired,
  updateClientSecretId: PropTypes.func.isRequired,
  orderType: PropTypes.string.isRequired,
};

Checkout.defaultProps = {
  paymentMethod: null,
};

const mapStateToProps = (state) => ({
  clientSecretId: updateClientSecretSelector(state),
  enableStripePaymentProcessor: state.checkout.enableStripePaymentProcessor,
  isFreeBasket: basketSelector(state).isFree,
  isBasketProcessing: basketSelector(state).isBasketProcessing,
  loading: paymentSelector(state).loading,
  loaded: paymentSelector(state).loaded,
  paymentMethod: paymentSelector(state).paymentMethod,
  submitting: paymentSelector(state).submitting,
  orderType: basketSelector(state).orderType,
});

const mapDispatchToProps = {
  fetchClientSecret,
  submitPayment,
};

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(Checkout));
