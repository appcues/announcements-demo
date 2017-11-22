$(document).ready(function() {

    // Staging
    // "https://api-staging.appcues.com"
    // 14538

    // Prod
    // "https://api.appcues.com"
    // 30401

    const API_URL = "https://api-staging.appcues.com";
    const ACCOUNT_ID = 14538;

    const IDENTIFY_URL = (user) => {
        return API_URL + "/v1/accounts/" + ACCOUNT_ID + "/users/" + user + "/activity"
    };
    const ANNOUNCEMENTS_URL = (user) => {
        return API_URL + "/v1/accounts/" + ACCOUNT_ID + "/users/" + user + "/nc?url=" + window.location.href;
    };
    const ANNOUNCEMENT_URL = (user, announcementId) => {
        return API_URL + "/v1/accounts/" + ACCOUNT_ID + "/users/" + user + "/nc/items/" + announcementId;
    };
    const MARK_SEEN = "appcues:nc_item_mark_seen";
    const CLEAR_SEEN = "appcues:nc_item_clear_seen";

    const identify = (user, postData) => {
        const data = JSON.stringify(postData);
        return $.post(IDENTIFY_URL(user), postData)
    }

    const getAnnouncements = (user) => {

        $.get(ANNOUNCEMENTS_URL(user))
        .done((data, textStatus, jqX) => {
            if (!data._embedded) return [];
            const flows = data._embedded["appcues:nc_item"];
            const announcementsData = flows.filter((item) => {
                return item && item.content_type === "announcement"
            });
            
            const announcementsList = announcementsData.map((item) => {
                if (item) {
                    return ({
                        id: item.id,
                        seen: item.seen,
                        name: item.content.name,
                        title: item.content.attributes.content.title,

                    })
                }
            });
            console.log('QUALIFIED', announcementsList)
            if (announcementsList.length > 0) {
                loadAnnouncementsMenu(announcementsList);
            }

            $('#main .container.all-results code').empty();
            $('#main .container.all-results code').text(JSON.stringify(data))
            return announcementsList
        });
    }

    const getAnnouncement = (user, announcementId) => {

        $.get(ANNOUNCEMENT_URL(user, announcementId))
        .done((data, textStatus, jqX) => {
            if (data.content.length < 1) return [];
            const imgUrl = data.content.attributes.content.img;

            const shouldAppendProtocol = imgUrl && data.content.attributes.content.img.match(/^\/{2}/);

            const announcementData = {
                id: data.id,
                seen: data.seen,
                name: data.content.name,
                title: data.content.attributes.content.title,
                imgUrl: shouldAppendProtocol ? ('https:' + imgUrl) : imgUrl,
                bodyText: data.content.attributes.content.body.bodyText,
                bodyHtml: data.content.attributes.content.body.bodyHtml,
                links: data.content.attributes.content.links,
                markSeenUrl: API_URL + data._links[MARK_SEEN].href,
                clearSeenUrl: API_URL + data._links[CLEAR_SEEN].href
            }

            loadAnnouncementItem(announcementData);

        });
    }

    const loadAnnouncementsMenu = (announcements) => {
        $('#main .option.announcements .announcement-box').empty();
        
        const elements = announcements.map(function(item) {

            const checkMark = '<img class="check ' + (item.seen ? '' : 'hidden') + '" src="http://findicons.com/files/icons/767/wp_woothemes_ultimate/128/checkmark.png" />';
            return '<div class="announcement"><span data-id="' + item.id + '"><span>' + item.title + '</span>' + checkMark + '</span></div>';
        });

        $('#main .option.announcements .announcement-box').append(elements);
    }

    const loadAnnouncementItem = (announcement) => {
        const announcementContainer = $('#main .announcement-opened');
        const announcementContainerIsOpen = !announcementContainer.hasClass('hidden');
        const announcementCurrentId = announcementContainer.attr('data-id');
        const isSelectedChanged = announcement.id !== announcementCurrentId;
        if (!isSelectedChanged && announcementContainerIsOpen) {
            announcementContainer.addClass('hidden');
        }

        announcementContainer.attr('data-id', announcement.id);
        announcementContainer.find('.img img').attr('src', announcement.imgUrl);
        announcementContainer.children('p.title').text(announcement.title);
        announcementContainer.children('p.bodyText').html(announcement.bodyHtml);
        announcementContainer.find('.btn-row .mark-btn').attr('data-url', announcement.markSeenUrl);
        announcementContainer.find('.btn-row .clear-btn').attr('data-url', announcement.clearSeenUrl);

        announcementContainer.toggleClass('hidden')
    }

    const toggleSeen = function(URL) {
        return $.post(URL)
    }

    $('form#identify-user').on('submit', (e) => {
        e.preventDefault();
        const user = $('#username').val().trim();
        const color = $('#color').val();
        const food = $('#food').val().trim().toLowerCase();
        const showAllContent = $('#cb4')[0].checked;

        const postData = {
            "profile_update": {
              "user": user,
              "favorite_color": color || '',
              "favorite_food": food,
            }
        }

        identify(user, postData)
        .done(function(resp) {
            console.log('IDENTIFIED', postData)
            getAnnouncements(user);
        });

        $('#main').on('click','.container .option.announcements .announcement>span', (e) => {
            const clickedId = $(e.currentTarget).data('id');
            getAnnouncement(user, clickedId);
        })

        $('#main').on('click','.announcement-opened .btn-row .mark-btn',function(e){
            e.preventDefault();

            const markUrl = $(this).attr('data-url');

            const id = $(this).parents('.announcement-opened').attr('data-id');
            console.log('markSeenUrl', markUrl, id)
            toggleSeen(markUrl)
            .done((resp) => {
                console.log('UPDATE LIST for', user);
                $('#main').find('.announcement-opened').toggleClass('hidden');
                getAnnouncements(user);
            });
        })

        $('#main').on('click','.announcement-opened .btn-row .clear-btn',function(e){
            e.preventDefault();

            const clearUrl = $(this).attr('data-url');
            console.log('clearSeenUrl', clearUrl)
            toggleSeen(clearUrl)
            .done((resp) => {
                console.log('UPDATE LIST for ', user);
                $('#main').find('.announcement-opened').toggleClass('hidden');
                getAnnouncements(user);
            });
        })
    })

});
