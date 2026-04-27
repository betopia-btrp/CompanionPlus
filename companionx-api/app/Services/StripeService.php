<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Stripe\Checkout\Session;
use Stripe\Customer;
use Stripe\Price;
use Stripe\Product;
use Stripe\Stripe;

class StripeService
{
    public function __construct()
    {
        Stripe::setApiKey(config('stripe.secret'));
    }

    public function createCustomer(User $user): string
    {
        if ($user->stripe_customer_id) {
            return $user->stripe_customer_id;
        }

        $customer = Customer::create([
            'email' => $user->email,
            'name' => trim($user->first_name . ' ' . $user->last_name),
            'metadata' => ['user_id' => (string) $user->id],
        ]);

        $user->update(['stripe_customer_id' => $customer->id]);

        return $customer->id;
    }

    public function createCheckoutSession(User $user, SubscriptionPlan $plan, string $successUrl, string $cancelUrl): Session
    {
        $customerId = $this->createCustomer($user);

        return Session::create([
            'customer' => $customerId,
            'mode' => 'subscription',
            'line_items' => [[
                'price' => $plan->stripe_price_id,
                'quantity' => 1,
            ]],
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'client_reference_id' => (string) $user->id,
            'metadata' => [
                'plan_id' => (string) $plan->id,
            ],
        ]);
    }

    public function createBookingCheckoutSession(User $user, float $amount, Booking $booking, string $successUrl, string $cancelUrl): Session
    {
        $customerId = $this->createCustomer($user);

        return Session::create([
            'customer' => $customerId,
            'mode' => 'payment',
            'line_items' => [[
                'price_data' => [
                    'currency' => 'bdt',
                    'product_data' => [
                        'name' => 'Session Booking',
                        'description' => 'Consultation session with booking #' . $booking->id,
                    ],
                    'unit_amount' => (int) ($amount * 100),
                ],
                'quantity' => 1,
            ]],
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'client_reference_id' => (string) $user->id,
            'metadata' => [
                'booking_id' => (string) $booking->id,
            ],
        ]);
    }

    public function retrieveCheckoutSession(string $sessionId): Session
    {
        return Session::retrieve([
            'id' => $sessionId,
            'expand' => ['subscription'],
        ]);
    }

    public function syncProductAndPrice(SubscriptionPlan $plan): void
    {
        $product = Product::create([
            'name' => $plan->name . ' (' . $plan->type . ')',
            'metadata' => [
                'plan_id' => (string) $plan->id,
                'plan_type' => $plan->type,
            ],
        ]);

        $stripePrice = Price::create([
            'product' => $product->id,
            'unit_amount' => (int) ($plan->price * 100),
            'currency' => 'bdt',
            'recurring' => ['interval' => rtrim($plan->billing_interval, 'ly')],
        ]);

        $plan->update(['stripe_price_id' => $stripePrice->id]);
    }
}
