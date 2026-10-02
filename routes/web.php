<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'lumina')->name('home');

Route::view('/paletas', 'lumina', [
    'page' => 'palettes',
    'title' => 'Menoiro · Paletas armónicas',
    'description' => 'Paletas de 5 colores que combinan entre sí, generadas con reglas de armonía en OKLCH.',
])->name('palettes');

Route::view('/personaje', 'lumina', [
    'page' => 'character',
    'title' => 'Menoiro · Personaje 70-20-10',
    'description' => 'Asigna los colores de tu paleta a un personaje con la regla 70-20-10.',
])->name('character');
