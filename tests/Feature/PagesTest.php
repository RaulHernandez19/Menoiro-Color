<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PagesTest extends TestCase
{
    /**
     * @return array<string, array{string, string, string}>
     */
    public static function pages(): array
    {
        return [
            'iluminación' => ['/', 'lighting', 'Menoiro · Generador de paletas'],
            'paletas armónicas' => ['/paletas', 'palettes', 'Menoiro · Paletas armónicas'],
        ];
    }

    #[DataProvider('pages')]
    public function test_each_window_mounts_its_own_page(string $uri, string $page, string $title): void
    {
        $this->withoutVite();

        $this->get($uri)
            ->assertOk()
            ->assertSee('data-page="'.$page.'"', false)
            ->assertSee("<title>{$title}</title>", false);
    }
}
