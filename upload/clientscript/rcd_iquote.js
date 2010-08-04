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
     *
     */
    Pre_Votes_PostBit_Init: null,

    /**
     * onload event handler
     *
     * @param string post_list_id - ID of element which contains all posts
     */
    init: function(post_list_id) {
        var post_list = fetch_object(post_list_id);
        if ( !post_list ) {
            return;
        }

        //make sure quick reply is there. taken from vbulletioin_quick_reply.js
        if (!fetch_object('quick_reply')) {
           return;
        }

        iQuote.add_handlers(post_list);

        // generate menu which shown even click occurs not on menu
        iQuote.context_menu = new YAHOO.widget.Menu("iquote_popup_menu", {'clicktohide': false});
        iQuote.context_menu.render(document.body);

        // override PostBit_Init
        Pre_Votes_PostBit_Init = PostBit_Init;
        PostBit_Init = function (obj, post_id)
        {
            iQuote.add_handlers(obj);

            Pre_Votes_PostBit_Init(obj, post_id);
        }

    },

    /**
     * add handler on posts
     *
     * @param string post_list - object fetched by post_list_id
     */
    add_handlers: function(post_list) {
        var post_rows = YAHOO.util.Dom.getElementsByClassName("postbody","*",post_list);
        var check_for_id = function(el) {
           if ( el.id && (0 <= el.id.indexOf("post_message_")) ) {
              return true;
           }
           return false;
        };

        for ( var i = 0; i < post_rows.length; i++ ) {
            var post_content = YAHOO.util.Dom.getElementBy(check_for_id,"div",post_rows[i]);
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

        // hide menu w/o scroll to prev. selected element if it is shown
        if (iQuote.context_menu)
        {
            iQuote.hide_menu();
        }

        // selection must be empty at this step
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

        if ( iQuote.selected_post_number && (iQuote.selected_post_number == post_number) )
        {
            iQuote.selected_text = iQuote.getSelectedText();

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

                    if (window.getSelection) {

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

                //iquote widget is based on standard popup class, which display property is set to none by default
                YAHOO.util.Dom.setStyle(YAHOO.util.Dom.getElementsByClassName("popupbody","*",fetch_object('iquote_popup_menu')), "display", "block");
                iQuote.context_menu.show();

                // hide menu for prevent adding of text content of menu to selected text during copypasting by context menu or CTRL+C/CTRL+V
                var copy_callback = function(e)
                {
                    iQuote.hide_menu();
                    return true;
                }

                YAHOO.util.Event.on(document, "keydown", copy_callback);
                YAHOO.util.Event.on(document, "contextmenu", copy_callback);
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

        var s = iQuote.getScrollXY();

        //store previously entered text, as qr_handle_activate will clear it
        var previously_entered_comment = vB_Editor[QR_EditorID].get_editor_contents();
        var quote_text = '';

        // ff even on empty text returns <br>, so we'll won't insert it to avoid empty leading string
        if (previously_entered_comment && previously_entered_comment != "<br>") {
           quote_text += previously_entered_comment;
        }
                                                                                                     
        //reposition Quick Reply form
        iQuote.repositionQuickReply(iQuote.selected_post_number);

        var username = iQuote.getPosterName(iQuote.selected_post_number);

        //show hidden quick reply after it was moved
        qr_activate(iQuote.selected_post_number);

        // from vB_Text_Editor_Events.prototype.attachinsertall_onclick (file clientscript/vbulletin_textedit.js)
        var breakchar = (vB_Editor[QR_EditorID].wysiwyg_mode ? '<br /><br />' : '\r\n\r\n');
        quote_text += "[quote=" + username + ";" + iQuote.selected_post_number + "]" + iQuote.selected_text + "[/quote]" + breakchar;
        
        vB_Editor[QR_EditorID].insert_text(quote_text, quote_text.length, 0);

        iQuote.selected_post_number = 0;
        iQuote.selected_text = '';

        // hide menu w/o scrolling to prev. selected element
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
        // make the cancel button visible
	var cancelbtn = fetch_object('qr_cancelbutton');
	cancelbtn.style.display = '';

        // add form into container below the post we are replying to
	var qrobj = document.createElement("li");
	qrobj.id = "qr_" + post_id;
	var post = YAHOO.util.Dom.get("post_" + post_id);
	var qr_container = post.parentNode.insertBefore(qrobj, post.nextSibling);
	var qr_form = fetch_object('quick_reply');
	qr_container.appendChild(qr_form);

    },

    /**
     * get name of poster
     */
    getPosterName: function(post_number)
    {
        var post = document.getElementById("post_" + post_number);
        var username = YAHOO.util.Dom.getElementsByClassName( "username", "a", post )[0];
        username = username.text || username.textContent || username.innerText || username.innerHTML.replace(/<[^>]+>/g, "");
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

        iQuote.context_menu = new YAHOO.widget.Menu(clone, {'clicktohide': false});
        iQuote.context_menu.render(document.body);
    },

    /**
     * get current scroll position
     */
    getScrollXY: function()
    {
        var scrOfX = 0, scrOfY = 0;

        if (typeof( window.pageYOffset ) == 'number') // Netscape compliant
        {
            scrOfY = window.pageYOffset;
            scrOfX = window.pageXOffset;
        }
        else if (document.body && ( document.body.scrollLeft || document.body.scrollTop )) // DOM compliant
        {
            scrOfY = document.body.scrollTop;
            scrOfX = document.body.scrollLeft;
        }
        else if (document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop )) // IE6 standards compliant mode
        {
            scrOfY = document.documentElement.scrollTop;
            scrOfX = document.documentElement.scrollLeft;
        }

        if ( typeof( window.pageYOffset ) != 'number' && !document.body && !document.documentElement ) // Unsupported browser
        {
            return false;
        }
        
        return [ scrOfX, scrOfY ];
    }

};
