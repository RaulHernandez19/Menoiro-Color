<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="bg-void">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#0B0C10">
        <meta name="description" content="{{ $description ?? 'Genera paletas de luz y sombra a partir de un color base usando matemática OKLCH.' }}">

        <title>{{ $title ?? 'Menoiro · Generador de paletas' }}</title>

        @fonts
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    </head>
    <body>
        <div id="app" data-page="{{ $page ?? 'lighting' }}"></div>
    </body>
</html>
