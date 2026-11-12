<section class="intro">
    <h1>Shared session <span class="accent">/s/<?= e($sessionId) ?></span></h1>
    <p>Watch someone else's git commands replay, one by one.</p>
</section>

<?php
$toolbar = '<div class="tools">'
    . '<span class="progress" data-progress>0 / 0 commands</span>'
    . '<button type="button" data-action="restart">Restart</button>'
    . '<button type="button" data-action="step">Step</button>'
    . '<button type="button" data-action="play" class="primary">Play</button>'
    . '</div>';
require ROOT . '/views/partials/workspace.php';
?>

<p class="after"><a href="/">Open the sandbox</a> to try it yourself.</p>

<script type="module" src="/assets/js/pages/replay.js"></script>
