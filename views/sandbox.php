<section class="intro">
    <h1>Type git. <span class="accent">Watch it happen.</span></h1>
    <p>Every command you run redraws the commit graph, so you can see what branches, merges and HEAD actually are.</p>
</section>

<?php
$toolbar = '<div class="tools">'
    . '<button type="button" data-action="undo" title="Undo (or type undo)">Undo</button>'
    . '<button type="button" data-action="redo" title="Redo (or type redo)">Redo</button>'
    . '<button type="button" data-action="reset">Reset</button>'
    . '<button type="button" data-action="share" class="primary">Share</button>'
    . '</div>';
require ROOT . '/views/partials/workspace.php';
?>

<section class="cheats" aria-label="Commands to try">
    <code>git commit -m "first"</code>
    <code>git switch -c feature</code>
    <code>git merge feature</code>
    <code>git checkout HEAD~1</code>
    <code>git reset --hard HEAD~1</code>
    <code>git log --oneline</code>
</section>

<dialog class="share-dialog" data-share-dialog>
    <form method="dialog">
        <h2>Your session is saved</h2>
        <p>Anyone with this link can watch your commands replay step by step.</p>
        <div class="share-row">
            <input readonly aria-label="Share link">
            <button type="button" data-copy class="primary">Copy link</button>
        </div>
        <button class="close">Done</button>
    </form>
</dialog>

<script type="module" src="/assets/js/pages/sandbox.js"></script>
