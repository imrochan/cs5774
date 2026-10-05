/* ==========================================================================
   CardSplit - behaviour layer
   CS 5774 Project 3

   Three features live here, each guarded so the file can be linked from every
   page without running code that does not belong there:

     1. Simulated search          search.html
     2. Stage advance             list.html    click  + event delegation
     3. Ownership split check     add.html     input  + DOM traversal

   jQuery is the only library used. There are no inline handlers in the HTML;
   every listener is attached below.
   ========================================================================== */

$(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     1. SIMULATED SEARCH                                          search.html

     The header form submits by GET to search.html, so the phrase arrives in
     the query string. We read it, normalise it, and use a switch to decide
     between simulated results and a friendly empty state. Nothing is actually
     searched; the matches below are fixed.
     --------------------------------------------------------------------- */

  var KEYPHRASE = "charizard";

  // Simulated hits, returned only for the keyphrase above.
  var SIMULATED_RESULTS = [
    {
      label: "Charizard VMAX 074/189",
      note: "Open position, at grader 41 days",
      href: "detail.html"
    },
    {
      label: "Charizard VMAX 074/189, settled",
      note: "Sold 28 Sep for $540.00, one payout outstanding",
      href: "detail-sold.html"
    },
    {
      label: "PSA submission 88213704 is overdue",
      note: "Alert, 11 days past the quoted turnaround",
      href: "detail.html"
    }
  ];

  var $echo = $("#search-echo");

  // Only search.html carries these elements, so everything below is skipped
  // on the other five pages.
  if ($echo.length) {
    var rawQuery = new URLSearchParams(window.location.search).get("q");
    var query = $.trim(rawQuery || "").toLowerCase();

    var $resultsPanel = $("#results-panel");
    var $emptyPanel = $("#empty-panel");

    // .text() rather than .html(), so a phrase containing markup is shown as
    // the characters the user typed instead of being parsed.
    if (query) {
      $echo.text('Showing results for "' + $.trim(rawQuery) + '"');
    } else {
      $echo.text("No search phrase was submitted.");
    }

    switch (query) {
      case KEYPHRASE:
      case "charizard vmax":
        // Build the result list from the array above rather than from markup
        // already sitting in the page.
        var $list = $("#results-list");

        $.each(SIMULATED_RESULTS, function (index, result) {
          var $link = $("<a>")
            .attr("href", result.href)
            .append($("<span>").addClass("queue__label").text(result.label))
            .append($("<span>").addClass("meta").text(result.note));

          $list.append($("<li>").append($link));
        });

        $("#results-count").text(SIMULATED_RESULTS.length);
        $resultsPanel.prop("hidden", false);
        break;

      case "":
        $("#empty-message").text("You did not type anything to search for.");
        $emptyPanel.prop("hidden", false);
        break;

      default:
        $("#empty-message").text(
          "Nothing matches that search. No position, sale, or alert came back."
        );
        $emptyPanel.prop("hidden", false);
        break;
    }
  }


  /* ------------------------------------------------------------------------
     2. STAGE ADVANCE                              list.html, click, delegation

     Event: click.
     Delegation: a single listener on the table body handles all eight rows,
     and would handle rows added later by Project 3's backend without being
     rebound.
     Modifies: the stage badge text and class, and the days-in-stage figure.
     Adds:     a new <li> in the session log, where none existed before.
     --------------------------------------------------------------------- */

  var STAGES = ["Raw", "At grader", "Graded", "Listed", "Sold"];

  // One listener, bound to the table body, not to the eight buttons.
  $("#positions-table tbody").on("click", ".js-advance", function () {
    var $button = $(this);
    var $row = $button.closest("tr");
    var $badge = $row.find(".js-stage");

    var current = $.trim($badge.text());
    var nextIndex = $.inArray(current, STAGES) + 1;

    // Already settled: nothing left to advance to.
    if (nextIndex <= 0 || nextIndex >= STAGES.length) {
      return;
    }

    var nextStage = STAGES[nextIndex];
    var cardName = $.trim($row.find(".cardcell strong").text());

    // --- modify existing elements ---
    $badge.text(nextStage).addClass("badge--moved");
    $row.find(".js-days").text("0");

    if (nextStage === "Sold") {
      $button.prop("disabled", true).text("Settled");
    }

    // --- add a new element ---
    var $entry = $("<li>").append(
      $("<span>")
        .addClass("queue__label")
        .text(cardName + " moved to " + nextStage)
    );

    $("#stage-log-list").append($entry);
    $("#stage-log-empty").hide();
  });


  /* ------------------------------------------------------------------------
     3. OWNERSHIP SPLIT CHECK                   add.html, input, DOM traversal

     Event: input, so the feedback updates as the user types rather than on
            blur or submit.
     Traversal: from the changed input outwards with .closest(), then back down
            with .find(), so no selector depends on the document structure
            beyond the fieldset the input sits in.
     Modifies: the field wrapper's validity class, the tally text and class,
            and the submit button's disabled state.
     Adds:     a <p class="split-error"> after the tally when the shares do not
            total 100, removed again once they do.

     This is the only form validation among the two interactions.
     --------------------------------------------------------------------- */

  var $shareInputs = $(".js-share");

  if ($shareInputs.length) {
    $shareInputs.on("input", function () {
      var $changed = $(this);

      // Outwards to the field wrapper, to flag this one input.
      var value = parseFloat($changed.val());
      var isValid = !isNaN(value) && value >= 0 && value <= 100;
      $changed.closest(".field").toggleClass("is-invalid", !isValid);

      // Outwards to the fieldset, then back down to every share in it. The sum
      // is computed from the group rather than from three hard-coded ids.
      var $fieldset = $changed.closest("fieldset");
      var total = 0;

      $fieldset.find(".js-share").each(function () {
        var share = parseFloat($(this).val());
        if (!isNaN(share)) {
          total += share;
        }
      });

      // Down to the tally inside the same fieldset.
      var $tally = $fieldset.find(".tally");
      var balanced = total === 100;

      $tally.find(".js-total").text(total + "% of $310.00");
      $tally.toggleClass("tally--error", !balanced);

      // The added element. Removed and recreated so there is never a stale or
      // duplicated message sitting in the page.
      $fieldset.find(".split-error").remove();

      if (!balanced) {
        var shortfall = 100 - total;
        var message = shortfall > 0
          ? "Shares are " + shortfall + "% short of 100%."
          : "Shares are " + Math.abs(shortfall) + "% over 100%.";

        $("<p>")
          .addClass("split-error")
          .attr("role", "alert")
          .text(message)
          .insertAfter($tally);
      }

      // Outwards to the form, then down to its submit button.
      $changed
        .closest("form")
        .find("button[type=submit]")
        .prop("disabled", !balanced);
    });
  }

});
