<?php

namespace App\Console\Commands;

use App\Models\SubscriptionPlan;
use App\Services\StripeService;
use Illuminate\Console\Command;
use Stripe\Product;
use Stripe\Stripe;

class SyncStripePrices extends Command
{
    protected $signature = 'stripe:sync-prices';
    protected $description = 'Create or link Stripe products and prices for subscription plans';

    public function handle(StripeService $stripe): void
    {
        Stripe::setApiKey(config('stripe.secret'));

        $plans = SubscriptionPlan::whereNull('stripe_price_id')->get();

        if ($plans->isEmpty()) {
            $this->info('All plans already have Stripe price IDs.');
            return;
        }

        foreach ($plans as $plan) {
            $this->line("Syncing: {$plan->name} ({$plan->type})...");

            try {
                $existing = Product::all(['limit' => 100, 'active' => true]);
                $matched = null;

                foreach ($existing->data as $product) {
                    if (($product->metadata['plan_id'] ?? null) === (string) $plan->id) {
                        $matched = $product;
                        break;
                    }
                }

                if ($matched) {
                    $prices = \Stripe\Price::all([
                        'product' => $matched->id,
                        'limit' => 1,
                        'active' => true,
                    ]);

                    $priceId = $prices->data[0]->id ?? null;

                    if ($priceId) {
                        $plan->update(['stripe_price_id' => $priceId]);
                        $this->info("  Linked existing. Price ID: {$priceId}");
                        continue;
                    }
                }

                $stripe->syncProductAndPrice($plan);
                $this->info("  Created. Price ID: {$plan->stripe_price_id}");
            } catch (\Throwable $e) {
                $this->error("  Failed: {$e->getMessage()}");
            }
        }
    }
}
