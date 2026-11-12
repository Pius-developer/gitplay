<?php /** Shared terminal + graph markup. $toolbar is optional HTML for buttons above the graph. */ ?>
<section class="workspace" data-workspace <?= isset($sessionId) ? 'data-session="' . e($sessionId) . '"' : '' ?>>
    <div class="pane terminal" data-terminal>
        <div class="pane-head"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span>terminal</span></div>
        <div class="output" data-output role="log" aria-live="polite"></div>
        <form class="input-row" autocomplete="off">
            <label for="cmd" class="prompt" data-prompt>$</label>
            <input id="cmd" name="cmd" spellcheck="false" autocapitalize="off" placeholder='git commit -m "message"'>
        </form>
    </div>
    <div class="pane graph-pane">
        <div class="pane-head">
            <span>commit graph</span>
            <?= $toolbar ?? '' ?>
        </div>
        <div class="graph-scroll" data-graph></div>
    </div>
</section>
