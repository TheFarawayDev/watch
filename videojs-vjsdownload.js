(() => {
    if (typeof videojs === "undefined") {
        console.warn("vjsdownload videojs not detected");
    }

    var Plugin = videojs.getPlugin("plugin");

    class VjsDownload extends Plugin {
        defaultOptions = {
            beforeElement: "fullscreenToggle",
            textControl: "Download video",
            name: "downloadButton",
            downloadURL: null
        };

        options;

        constructor(player, options) {
            super(player, options);
            this.options = { ...this.defaultOptions, ...options };
            player.addClass("vjs-download");

            this.on(player, "ready", () => {
                let Button = videojs.getComponent("Button");
                let downloadButton = new Button(player, {
                    className: "vjs-download",
                    controlText: "Download",
                    clickHandler: this.handleClick.bind(this)
                });

                player.getChild("ControlBar").el().insertBefore(
                    downloadButton.el(),
                    player.controlBar.getChild(this.options.beforeElement).el()
                );
            });
        }

        handleClick() {
            let downloadURL = this.player().vjsdownload()?.options.downloadURL || this.player().currentSource().src;
            window.open(downloadURL, "Download");
            this.player().trigger("downloadvideo");
        }
    }

    videojs.registerPlugin("vjsdownload", VjsDownload);
})();

var player = videojs(document.querySelector('.video-js'), {
    plugins: {
        vjsdownload: {
            beforeElement: 'fullscreenToggle', // default fullscreenMenuToggle
            textControl: 'Download video', // default "Download video"
            name: 'downloadButton' // default "downloadButton"
        }
    }
}, function() {
    console.log('Callback video-js initiated');
    this.on('downloadvideo', function() {
        console.log('downloadvideo triggered');
    });
});