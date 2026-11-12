<div class="challenges-layout">
    <aside class="levels">
        <h2>Levels</h2>
        <ol data-challenge-list></ol>
    </aside>

    <div class="challenge-main">
        <section class="challenge" data-challenge>
            <h1 data-title>Loading…</h1>
            <p class="lead" data-intro></p>
            <ul class="checklist" data-checklist></ul>
            <details>
                <summary>Show a hint</summary>
                <code data-hint></code>
            </details>
            <div class="success" data-success hidden>
                <p>Level complete. Nicely done.</p>
                <button type="button" class="primary" data-next>Next level</button>
            </div>
            <button type="button" class="ghost" data-restart>Restart level</button>
        </section>

        <?php $toolbar = ''; require ROOT . '/views/partials/workspace.php'; ?>
    </div>
</div>

<script type="module" src="/assets/js/pages/challenges.js"></script>
