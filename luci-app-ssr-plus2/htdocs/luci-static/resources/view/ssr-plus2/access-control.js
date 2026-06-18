'use strict';
'require view';
'require fs';
'require ui';


return view.extend({
    load: function() {
        return L.resolveDefault(fs.read('/etc/ssr-plus2/global-white-domain'), '');
    },

    handleSave: function(ev) {
        var value = (document.querySelector('textarea').value || '').trim().replace(/\r\n/g, '\n') + '\n';

        return fs.write('/etc/ssr-plus2/global-white-domain', value).then(function(rc) {
            document.querySelector('textarea').value = value;
            ui.addNotification(null, E('p', _('Contents have been saved.')), 'info');
            // fs.exec('/etc/init.d/firewall', ['restart']);
        }).catch(function(e) {
            ui.addNotification(null, E('p', _('Unable to save contents: %s').format(e.message)));
        });
    },

    render: function(data) {
        return E([
            E('h2', _('Bypass Domain List(Global)')),
            E('p', {}, E('textarea', { 'style': 'width:100%', 'rows': 25 }, [ data != null ? data : '' ]))
        ]);
    },
    
    handleSaveApply: null,
    handleReset: null
});