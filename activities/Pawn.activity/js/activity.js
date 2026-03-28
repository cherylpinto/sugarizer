define(["sugar-web/activity/activity", "sugar-web/env", "sugar-web/graphics/icon", "l10n", "sugar-web/graphics/presencepalette", "sugar-web/datastore", "sugar-web/graphics/journalchooser", "pawnpalette", "tutorial"], function (activity, env, icon, l10n, presencepalette, datastore, journalchooser, pawnpalette, tutorial) {

	// Manipulate the DOM only when it is ready.
	requirejs(['domReady!'], function (doc) {

		// Initialize the activity.
		activity.setup();

		// Welcome user
		var currentenv;
		var currentBackground = "";
		env.getEnvironment(function(err, environment) {
			currentenv = environment;

			// Set current language to Sugarizer
			var defaultLanguage = (typeof chrome != 'undefined' && chrome.app && chrome.app.runtime) ? chrome.i18n.getUILanguage() : navigator.language;
			var language = environment.user ? environment.user.language : defaultLanguage;
			l10n.init(language);

			// Load from datastore
			if (!environment.objectId) {
				console.log("New instance");
			} else {
				activity.getDatastoreObject().loadAsText(function(error, metadata, data) {
					if (error==null && data!=null) {
						var parsed = JSON.parse(data);
						pawns = parsed.pawns || JSON.parse(data); // backward compatibility
						currentBackground = parsed.background || "";
						drawPawns();
						if (currentBackground) {
							document.getElementById("canvas").style.backgroundImage = "url('"+currentBackground+"')";
						}
					}
				});
			}

			// Shared instances
			if (environment.sharedId) {
				console.log("Shared instance");
				presence = activity.getPresenceObject(function(error, network) {
					network.onDataReceived(onNetworkDataReceived);
					network.onSharedActivityUserChanged(onNetworkUserChanged);
				});
			}
		});

		// Draw pawns
		var pawns = [];
		var drawPawns = function() {
			document.getElementById("pawns").innerHTML = '';
			for (var i = 0 ; i < pawns.length ; i++) {
				var pawn = document.createElement("div");
				pawn.className = "pawn";

				document.getElementById("pawns").appendChild(pawn);
				icon.colorize(pawn, pawns[i]);
			}
		}

		// Handle click on add via palette
		var addpalette = new pawnpalette.PawnPalette(document.getElementById("add-button"), "Add pawn");
		addpalette.addEventListener('pawnClick', function (event) {
			for (var i = 0 ; i < event.count ; i++) {
				pawns.push(currentenv.user.colorvalue);
				drawPawns();

				document.getElementById("user").innerHTML = "<h1>"+l10n.get("Played", {name:currentenv.user.name})+"</h1>";

				if (presence) {
					presence.sendMessage(presence.getSharedInfo().id, {
						user: presence.getUserInfo(),
						content: {
							action: 'update',
							data: currentenv.user.colorvalue
						}
					});
				}
			}
		});

		// Handle click on picture
		document.getElementById("picture-button").addEventListener('click', function (e) {
			journalchooser.show(function (entry) {
				// No selection
				if (!entry) {
					return;
				}
				// Get object content
				var dataentry = new datastore.DatastoreObject(entry.objectId);
				dataentry.loadAsText(function (err, metadata, data) {
					currentBackground = data;
					document.getElementById("canvas").style.backgroundImage = "url('"+currentBackground+"')";
					
					// Send background change to network
					if (presence) {
						presence.sendMessage(presence.getSharedInfo().id, {
							user: presence.getUserInfo(),
							content: {
								action: 'updateBackground',
								data: currentBackground
							}
						});
					}
				});
			}, { mimetype: 'image/png' }, { mimetype: 'image/jpeg' });
		});

		// Save in Journal on Stop
		document.getElementById("stop-button").addEventListener('click', function (event) {
			console.log("writing...");
			var jsonData = JSON.stringify({pawns: pawns, background: currentBackground});
			activity.getDatastoreObject().setDataAsText(jsonData);
			activity.getDatastoreObject().save(function (error) {
				if (error === null) {
					console.log("write done.");
				} else {
					console.log("write failed.");
				}
			});
		});

		// Launch tutorial
		document.getElementById("help-button").addEventListener('click', function(e) {
			tutorial.start();
		});

		// Process localize event
		window.addEventListener("localized", function() {
			document.getElementById("user").innerHTML = "<h1>"+l10n.get("Hello", {name:currentenv.user.name})+"</h1>";
			document.getElementById("add-button").title = l10n.get("AddPawn");
		});

		// Link presence palette
		var presence = null;
		var isHost = false;
		var palette = new presencepalette.PresencePalette(document.getElementById("network-button"), undefined);
		palette.addEventListener('shared', function() {
			palette.popDown();
			console.log("Want to share");
			presence = activity.getPresenceObject(function(error, network) {
				if (error) {
					console.log("Sharing error");
					return;
				}
				network.createSharedActivity('org.sugarlabs.Pawn', function(groupId) {
					console.log("Activity shared");
					isHost = true;
				});
				network.onDataReceived(onNetworkDataReceived);
				network.onSharedActivityUserChanged(onNetworkUserChanged);
			});
		});

		// Presence callbacks
		var onNetworkDataReceived = function(msg) {
			if (presence.getUserInfo().networkId === msg.user.networkId) {
				return;
			}
			switch (msg.content.action) {
				case 'init':
					pawns = msg.content.data.pawns || msg.content.data;
					currentBackground = msg.content.data.background || "";
					drawPawns();
					if (currentBackground) {
						document.getElementById("canvas").style.backgroundImage = "url('"+currentBackground+"')";
					}
					break;
				case 'update':
					pawns.push(msg.content.data);
					drawPawns();
					document.getElementById("user").innerHTML = "<h1>"+l10n.get("Played", {name:msg.user.name})+"</h1>";
					break;
				case 'updateBackground':
					currentBackground = msg.content.data;
					document.getElementById("canvas").style.backgroundImage = "url('"+currentBackground+"')";
					break;
			}
		};

		var onNetworkUserChanged = function(msg) {
			if (isHost) {
				presence.sendMessage(presence.getSharedInfo().id, {
					user: presence.getUserInfo(),
					content: {
						action: 'init',
						data: {pawns: pawns, background: currentBackground}
					}
				});
			}
			console.log("User "+msg.user.name+" "+(msg.move == 1 ? "join": "leave"));
		};

	});

});
