/**                                                                                                                                  
 * iQuote: code for inserting selected text into quick-reply form
 */
var iQuote = {

    /**
     * number of post in which text is selected initially
     */
    selected_post_number: 0,

    /**
     * selected text
     */
    selected_text: "",

    /**
     * YUI menu obj
     */
    context_menu: null,

    /**
     * Container for PostBit_Init function
     */
    pre_iquote_postbit_init: null,

    /**
     * Container for qr_newreply_activate function
     */
    pre_iquote_newreply_activate: null,

    /**
     * Display text, if reply with quote disabled
     */
    dialog_phrase: '',

    /**
     * onload event handler
     *
     * @param string posts_container_id - ID of element which contains all posts
     */
    init: function(posts_container_id, is_qr_disabled, dlg_phrase) {
        var posts_container = fetch_object(posts_container_id);
        if ( !posts_container ) {
            return;
        }

        // init menu only if quick reply box exists
        if (!fetch_object('quick_reply')) {
           return;
        }

        iQuote.context_menu = new YAHOO.widget.Menu("iquote_popup_menu",
                                                    {clicktohide: false,
                                                     effect: {
                                                         effect: YAHOO.widget.ContainerEffect.FADE,
                                                         duration: 0.25
                                                     }
                                                    });
        // Fix for IE7 z-index bug
        if (YAHOO.env.ua.ie && YAHOO.env.ua.ie < 8)
        {
            iQuote.context_menu.cfg.setProperty("position", "dynamic");
            iQuote.context_menu.cfg.setProperty("iframe", true);
            iQuote.context_menu.cfg.setProperty("zindex", 10100);
        }
        iQuote.context_menu.render(document.body);
        iQuote.add_handlers(posts_container);
        YAHOO.util.Dom.setStyle(YAHOO.util.Dom.getElementsByClassName("popupbody", "*", fetch_object('iquote_popup_menu')), "display", "block");

        iQuote.dialog_phrase = dlg_phrase;

        // init for AJAX loaded posts (inline edit etc)
        iQuote.pre_iquote_postbit_init = PostBit_Init;
        PostBit_Init = function (obj, post_id)
        {
            iQuote.add_handlers(obj);

            iQuote.pre_iquote_postbit_init(obj, post_id);
        }

        if (is_qr_disabled)
        {
            iQuote.pre_iquote_newreply_activate = qr_newreply_activate;
            qr_newreply_activate = function(event)
            {
                if (confirm(iQuote.dialog_phrase))
                {
                    iQuote.pre_iquote_newreply_activate.call(this,event);
                }
                else
                {
                    YAHOO.util.Event.stopEvent(event);
                }
            }
        }
    },

    /**
     * if element id contains idstring
     *
     * @param Element el
     * @param string idstring
     */
    check_for_id: function(el, idstring) {
        if ( el.id && (0 <= el.id.indexOf(idstring)) ) {
           return true;
        }
        return false;
    },

    /**
     * add handler on posts
     *
     * @param string posts_container - object fetched by posts_container_id
     */
    add_handlers: function(posts_container) {
        var post_rows = YAHOO.util.Dom.getElementsByClassName("postbody", "*", posts_container);
        var check_for_post_id = function(el) {
           return iQuote.check_for_id(el, "post_message_");
        };

        for ( var i = 0; i < post_rows.length; i++ ) {
            var post_content = YAHOO.util.Dom.getElementBy(check_for_post_id, "div", post_rows[i]);
            if (!post_content || !post_content.id) {
               continue;
            }
            var post_id = post_content.id;
            var post_number = post_id.substr(post_id.lastIndexOf("_") + 1);

            YAHOO.util.Event.on(post_rows[i], "mouseup", iQuote.selectionEnd, post_number);
            YAHOO.util.Event.on(post_rows[i], "mousedown", iQuote.selectionStart, post_number);
        }
    },

    /**
     * handler for selection start
     *
     * @param int post_number - number of post in which text is selected initially
     */
    selectionStart: function(event, post_number)
    {
        var e = window.event || event;
        var is_left_button = (!YAHOO.env.ua.ie && (e.button == 0)) || (YAHOO.env.ua.ie && (e.button == 1));

        // clear current selection only if left mouse button is used
        if (is_left_button)
        {
            if (window.getSelection)  // non-IE. Attention: order of IF is necessary because of Opera
            {
                window.getSelection().removeAllRanges();
            }
            else if (document.selection) // IE
            {
                document.selection.empty();
            }
        }

        if (iQuote.context_menu)
        {
            iQuote.hide_menu();
        }

        iQuote.selected_post_number = post_number;
    },

    /**
     * handler for selection end
     *
     * @param int post_number - number of post in which text is selected at the end
     */
    selectionEnd: function(event, post_number)
    {
        var e = window.event || event;
        var is_left_button = (!YAHOO.env.ua.ie && (e.button == 0)) || (YAHOO.env.ua.ie && (e.button == 1));

        // continue only if left mouse button is used
        if (!is_left_button) {
            return;
        }

        var check_for_editor_id = function(el) {
           return iQuote.check_for_id(el, "vB_Editor_QE_");
        };

        // show popup only if we are not editing message
        var editor = YAHOO.util.Dom.getElementBy(check_for_editor_id, "div", fetch_object('post_message_' + post_number));
        if ( iQuote.selected_post_number && (iQuote.selected_post_number == post_number) &&
             (!editor || editor == '') )
        {
            // firefox returns " " when user clicks on video (e.g. youtube), so we need to trim the string
            iQuote.selected_text = iQuote.getSelectedText().replace(/^\s\s*/, '').replace(/\s\s*$/, '');

            if ( '' !== iQuote.selected_text )
            {
                // show menu
                var xy = YAHOO.util.Event.getXY(event);
                xy[0] = xy[0] + 7;  // horizontal offset

                // Attention: for IE offset MUST be bigger than 10-15. Otherwise it will select text in whole comment area
                xy[1] = xy[1] - 35; // vertical offset (IE note: do not cross with IE Accelerator button)

                iQuote.context_menu.cfg.setProperty("xy", xy);

                // hack for non IE browsers: to save marking of selected text after menu show
                if (!YAHOO.env.ua.ie)
                {
                    var makeSelection = function(rangeData) {
                        var oRange = document.createRange();
                        oRange.setStart(rangeData.anchorNode, rangeData.anchorOffset);
                        oRange.setEnd(rangeData.focusNode, rangeData.focusOffset);
                        window.getSelection().addRange(oRange);
                    };
                    var onBlur = function(type, args, rangeData) {
                        makeSelection(rangeData);
                        iQuote.context_menu.unsubscribe("blur", onBlur);
                    };
                    var onFocus = function(type, args, rangeData) {
                        iQuote.context_menu.subscribe("blur", onBlur, rangeData);
                        iQuote.context_menu.blur();
                        iQuote.context_menu.unsubscribe("focus", onFocus);
                    };

                    if (window.getSelection)
                    {
                        var range = window.getSelection().getRangeAt(0);

                        var rangeData = {
                            anchorNode: range.startContainer,
                            anchorOffset: range.startOffset,
                            focusNode: range.endContainer,
                            focusOffset: range.endOffset
                        };

                        iQuote.context_menu.subscribe("focus", onFocus, rangeData);
                    }
                }

                iQuote.context_menu.show();

                // hide menu to prevent adding of text content of menu to selected text during copypasting by context menu or CTRL+C/CTRL+V
                YAHOO.util.Event.on(document, "keydown", iQuote.hide_menu);
                YAHOO.util.Event.on(document, "contextmenu", iQuote.hide_menu);
            } else {
               iQuote.selected_post_number = 0;
            }
        }
        else
        {
            iQuote.selected_text = '';
            iQuote.selected_post_number = 0;
        }
    },

    /**
     * get selected text. Looks as cross browser solution
     */
    getSelectedText: function()
    {
        if (window.getSelection) // non-IE browsers
        {
            return window.getSelection().toString();
        }

        if (document.getSelection) // old non-IE browsers
        {
            return document.getSelection();
        }

        if (document.selection && document.selection.createRange) // IE
        {
            return document.selection.createRange().text;
        }

        return '';
    },

    /**
     * insert selected text into quick reply form
     */
    quote_text: function()
    {
        if ( !iQuote.selected_post_number || !iQuote.selected_text )
        {
            return false;
        }

        // store previously entered text, as qr_handle_activate will clear it
        var previously_entered_comment = vB_Editor[QR_EditorID].get_editor_contents();
        var quote_text = '';

        // ff even on empty text returns <br>, so we won't insert it to avoid empty leading string
        if (previously_entered_comment && previously_entered_comment != "<br>") {
           quote_text += previously_entered_comment;
        }

        iQuote.repositionQuickReply(iQuote.selected_post_number);

        var username = iQuote.getPosterName(iQuote.selected_post_number);
        var breakchar = (vB_Editor[QR_EditorID].wysiwyg_mode ? '<br /><br />' : '\r\n\r\n');
        quote_text += "[quote=" + username + ";" + iQuote.selected_post_number + "]" + iQuote.selected_text + "[/quote]" + breakchar;
        vB_Editor[QR_EditorID].insert_text(quote_text, quote_text.length, 0);

        iQuote.selected_post_number = 0;
        iQuote.selected_text = '';
        iQuote.hide_menu();

        return false;
    },

    /**
     * reposition quick reply form under post
     *
     * precondition: post_id is a valid number
     * @param id of post under which to position
     */
    repositionQuickReply: function(post_id)
    {
        var cancelbtn = fetch_object('qr_cancelbutton');
        cancelbtn.style.display = '';

        // add form into container below the post we are replying to
        var qrobj = document.createElement("li");
        qrobj.id = "qr_" + post_id;
        var post = YAHOO.util.Dom.get("post_" + post_id);
        var qr_container = post.parentNode.insertBefore(qrobj, post.nextSibling);
        var qr_form = fetch_object('quick_reply');
        qr_container.appendChild(qr_form);
        qr_activate(iQuote.selected_post_number);
    },

    /**
     * get name of poster
     * @param id of post which author we want to know
     */
    getPosterName: function(post_number)
    {
        var post = document.getElementById("post_" + post_number);
        var username = YAHOO.util.Dom.getElementsByClassName( "username", "*", post )[0];
        username = username.textContent || username.innerText;
        
        return PHP.htmlspecialchars(username);
    },

    /**
     * hide menu with saving current scroll position
     *
     * used as fix for problems with copypaste (content of menu is added to selected text) and menu hide (page is scrolled to prev. selected element)
     */
    hide_menu: function() {
        var clone = iQuote.context_menu.srcElement.cloneNode(true);
        clone.id = "iquote_popup_menu";

        iQuote.context_menu.destroy();

        iQuote.context_menu = new YAHOO.widget.Menu(clone,
                                                    {clicktohide: false,
                                                     effect: {
                                                         effect: YAHOO.widget.ContainerEffect.FADE,
                                                         duration: 0.25
                                                     }
                                                    });

        // Fix for IE7 z-index bug
        if (YAHOO.env.ua.ie && YAHOO.env.ua.ie < 8)
        {
            iQuote.context_menu.cfg.setProperty("position", "dynamic");
            iQuote.context_menu.cfg.setProperty("iframe", true);
            iQuote.context_menu.cfg.setProperty("zindex", 10100);
        }
        iQuote.context_menu.render(document.body);

        YAHOO.util.Event.removeListener(document, "keydown", iQuote.hide_menu);
        YAHOO.util.Event.removeListener(document, "contextmenu", iQuote.hide_menu);

        return true;
    }
};
