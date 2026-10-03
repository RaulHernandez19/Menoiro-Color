<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'lumina')->name('home');

Route::view('/paletas', 'lumina', [
    'page' => 'palettes',
    'title' => 'Menoiro · Paletas armónicas',
    'description' => 'Paletas de 5 colores que combinan entre sí, generadas con reglas de armonía en OKLCH.',
])->name('palettes');
