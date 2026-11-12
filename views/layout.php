<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($title) ?></title>
    <meta name="description" content="Learn Git by playing: type real git commands and watch the commit graph animate. Built with vanilla JavaScript and PHP.">
    <meta name="csrf-token" content="<?= e(csrf_token()) ?>">
    <meta name="theme-color" content="#0f1312">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230f1312'/><circle cx='10' cy='22' r='4' fill='%233EE8A3'/><circle cx='22' cy='10' r='4' fill='%233EE8A3'/><path d='M10 18V12a2 2 0 0 1 2-2h6' stroke='%233EE8A3' stroke-width='2.5' fill='none'/></svg>">
    <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body class="page-<?= e($page) ?>">
<header class="top">
    <a href="/" class="brand" aria-label="GitPlay home">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><circle cx="10" cy="22" r="4"></circle><circle cx="22" cy="10" r="4"></circle><path d="M10 18V12a2 2 0 0 1 2-2h6"></path></svg>
        <span>gitplay</span>
    </a>
    <nav aria-label="Main">
        <a href="/" <?= $page === 'sandbox' ? 'aria-current="page"' : '' ?>>Sandbox</a>
        <a href="/challenges" <?= $page === 'challenges' ? 'aria-current="page"' : '' ?>>Challenges</a>
        <a href="https://github.com/pius-developer/gitplay" target="_blank" rel="noopener">Source</a>
    </nav>
</header>
<main>
    <?= $content ?>
</main>
<footer class="foot">
    <p>Built by <a href="https://x.com/ejike_pius" target="_blank" rel="noopener">Ejike Pius</a> with vanilla JavaScript and PHP. No frameworks.</p>
</footer>
</body>
</html>
