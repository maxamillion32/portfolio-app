angular.module('portfolio.services', [])

/**
 * Artworks respository
 */
.factory('ArtworkProvider', function artworkProviderFactory(LocalStorageProvider, PersistentStorageProvider) {

    var arts = [];

    return {
        init: function() {
            arts = LocalStorageProvider.getArtworksData();
        },

        all: function() {
            return arts;
        },

        allByCollection: function(collection) {
            var artworks = [];
            if (collection && collection.artwork_ids.length > 0) {
                for (var i in collection.artwork_ids) {
                    artId = collection.artwork_ids[i];
                    artworks.push(this.findById(artId));
                }
            }
            return artworks;
        },

        findById: function(id) {
            artwork = null;
            arts.map(function(a) {
                if (a.id == id) artwork = a;
            });
            return artwork;
        }

    };
})

/**
 * A service that helps iterating through artworks in single artwork view
 */
.factory('ArtworkIteratorProvider', function artworkIteratorProvider() {

    var artsIndex = [];
    var currentIndex = null;

    return {
        init: function(artworks, currentId) {
            artsIndex = [];
            currentIndex = [];
            artworks.map(function(a){
                artsIndex.push(a.id);
            });
            currentIndex = artsIndex.indexOf(Number(currentId));
            return this;
        },
        nextId: function() {
            nextIdx = artsIndex.length == currentIndex+1 ? 0 : currentIndex+1;
            return artsIndex[nextIdx];
        },
        prevId: function() {
            prevIdx = currentIndex === 0 ? artsIndex.length-1 : currentIndex-1;
            return artsIndex[prevIdx];
        }
    };
})

/**
 * Collections repository
 */
.factory('CollectionProvider', function collectionProviderFactory(LocalStorageProvider) {

    var collections = [];

    return {

        init: function() {
            collections = LocalStorageProvider.getCollectionsData();
        },

        all: function() {
            return collections;
        },

        findBySlug: function(slug) {
            collection = null;
            collections.map(function(c) {
                if (c.slug == slug) {
                    collection = c;
                }
            });
            return collection;
        }

    };
})

/**
 * A service that fetches and returns data from remote http locations
 */
.factory('RemoteDataProvider', function remoteDataProvider($http) {

    var apikey = '19957ec02e669s11e3ab523a0800270f67ea';
    var webservices_base_live = 'https://www.artfinder.com/api/v1/';
    var webservices_base_staging = 'https://artfinder:1nkandcrayon@www.staging.artfinder.com/api/v1/';
    var webservices = {
        auth: webservices_base_live + 'artist/$USER$/',
        artworks: webservices_base_live + 'product/$USER$/',
        collections: webservices_base_live + 'collection/$USER$/',
        subscription: webservices_base_staging + 'subscriber/$USER$/'
    }

    var getUrl = function(url, username) {
        return url.replace('$USER$', username);
    };

    return {
        fetchAuthDataForUser: function(username) {
            return $http.get(getUrl(webservices.auth, username), {
                params: { api_key: apikey }
            });
        },
        fetchArtworksForUser: function(username) {
            return $http.get(getUrl(webservices.artworks, username), {
                params: { api_key: apikey }
            });
        },
        fetchCollectionsForUser: function(username) {
            return $http.get(getUrl(webservices.collections, username), {
                params: { api_key: apikey }
            });
        },
        fetchBlob: function(url) {
            // Dirty workaround for access-origin errors
            url = url.replace('d30dcznuokq8w8.cloudfront.net', 's3.amazonaws.com/artfinder');
            console.log(url);
            return $http.get(url, {
                responseType: 'blob',
                cache: false,
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            });
        },
        subscribe: function(username, subscriberData) {
            return $http.post(getUrl(webservices.subscription, username), subscriberData, {
                headers: { 'Content-Type': 'application/json' },
                params: { api_key: apikey }
            });
        }
    };

})

/**
 * A service that manipulates with local storage
 */
.factory('LocalStorageProvider', function localStorageProvider() {

    var USER_KEY = 'username';
    var ARTWORKS_RAW_INDEX_KEY = 'raw_artworks';
    var ARTWORKS_INDEX_KEY = 'artworks';
    var COLLECTIONS_RAW_INDEX_KEY = 'raw_collections';
    var COLLECTIONS_INDEX_KEY = 'collections';
    var ARTWORK_OVERLAY_FLAG = 'artwork_overlay_flag';
    var BASE_URL = 'base_url';

    return {
        // Setters
        saveUsername: function(username) {
            window.localStorage.setItem(USER_KEY, username);
        },
        saveArtworksData: function(data) {
            window.localStorage.setItem(ARTWORKS_INDEX_KEY, JSON.stringify(data));
        },
        saveRawArtworksData: function(data) {
            window.localStorage.setItem(ARTWORKS_RAW_INDEX_KEY, JSON.stringify(data));
        },
        saveCollectionsData: function(data) {
            window.localStorage.setItem(COLLECTIONS_INDEX_KEY, JSON.stringify(data));
        },
        saveRawCollectionsData: function(data) {
            window.localStorage.setItem(COLLECTIONS_RAW_INDEX_KEY, JSON.stringify(data));
        },
        setArtworkInstructionsOverlayFlag: function() {
            window.localStorage.setItem(ARTWORK_OVERLAY_FLAG, 1);
        },
        setBaseUrl: function(data) {
            window.localStorage.setItem(BASE_URL, data);
        },

        // Getters
        getUsername: function() {
            return window.localStorage.getItem(USER_KEY);
        },
        getArtworksData: function() {
            return JSON.parse(window.localStorage.getItem(ARTWORKS_INDEX_KEY));
        },
        getRawArtworksData: function() {
            return JSON.parse(window.localStorage.getItem(ARTWORKS_RAW_INDEX_KEY));
        },
        getCollectionsData: function() {
            return JSON.parse(window.localStorage.getItem(COLLECTIONS_INDEX_KEY));
        },
        getRawCollectionsData: function() {
            return JSON.parse(window.localStorage.getItem(COLLECTIONS_RAW_INDEX_KEY));
        },
        getArtworkInstructionsOverlayFlag: function() {
            return window.localStorage.getItem(ARTWORK_OVERLAY_FLAG);
        },
        getBaseUrl: function() {
            return window.localStorage.getItem(BASE_URL);
        },

        // Removers
        removeRawArtworksData: function() {
            window.localStorage.removeItem(ARTWORKS_RAW_INDEX_KEY);
        },
        removeRawCollectionsData: function() {
            window.localStorage.removeItem(COLLECTIONS_RAW_INDEX_KEY);
        },
        purge: function() {
            window.localStorage.removeItem(USER_KEY);
            window.localStorage.removeItem(ARTWORKS_INDEX_KEY);
            window.localStorage.removeItem(ARTWORKS_RAW_INDEX_KEY);
            window.localStorage.removeItem(COLLECTIONS_INDEX_KEY);
            window.localStorage.removeItem(COLLECTIONS_RAW_INDEX_KEY);
            window.localStorage.removeItem(ARTWORK_OVERLAY_FLAG);
            window.localStorage.removeItem(BASE_URL);
        }
    };

})

/**
 * A service that manipulates with persistent storage
 */
.factory('PersistentStorageProvider', function persistentStorageProvider() {

    var DATADIR = 'artp';
    var QUOTA = 50*1024*1024; // 50MB
    var currentStorageDataDir;

    var requestStorageUsingFileStorageApi = function(storageType, grantedBytes, callback) {
        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
        window.requestFileSystem(storageType, grantedBytes, function(fileSystem) {
            fileSystem.root.getDirectory(DATADIR, { create: true },
                callback,
                errorHandler
            );
        }, errorHandler);
    };

    var requestStorage = function(callback) {
        if (window.cordova) {
            window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory, callback, errorHandler);
        } else if (window.webkitPersistentStorage) {
            window.webkitPersistentStorage.requestQuota(window.PERSISTENT, QUOTA, function(grantedBytes) {
                requestStorageUsingFileStorageApi(window.PERSISTENT, grantedBytes, callback);
            });
        } else {
            requestStorageUsingFileStorageApi(window.PERSISTENT, QUOTA, callback);
        }
    };

    var errorHandler = function(error) {
        var msg = '';
        switch (error.code) {
          case FileError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
          case FileError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
          case FileError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
          case FileError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
          case FileError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
          case FileError.NOT_READABLE_ERR:
            msg = 'NOT_READABLE_ERR';
            break;
          default:
            msg = 'Unknown Error';
            break;
        }

        console.log('Persistent storage error: ' + error.name + ', code: ' + error.code + ', message: ' + msg);
        console.log(error);
    };

    return {
        saveBlob: function(data, filename, callback) {
            requestStorage(function(dir) {
                dir.getFile(filename, { create: true }, function(file) {
                    file.createWriter(function(writer) {
                        writer.onwriteend = function(e) {
                            console.log(file.toURL());
                            callback(file);
                        };
                        writer.write(data);
                    });
                }, errorHandler);
            });
        },
        purge: function(callback) {
            requestStorage(function(dir) {
                //dir.removeRecursively(callback, errorHandler); //removing whole dir is not working when using cordova dir location

                var dirReader = dir.createReader();
                dirReader.readEntries(function(files) {
                    for (var i=0; i<files.length; ++i) {
                        files[i].remove(function() {}, errorHandler);
                    }
                });

                dir.remove(function() {}, function() {}); //this will remove directory, but if it can not than will forgot about it

                callback();
            });
        },
        getBaseUrl: function(callback) {
            requestStorage(function(dir) {
                var baseUrl = dir.toURL();
                if (baseUrl.substr(baseUrl.length - 1) !== '/') {
                    baseUrl += '/';
                }
                // console.log(baseUrl);

                callback(baseUrl);
            }, errorHandler);
        }
    };

})

/**
 * A service for displaying user messages, alerts
 */
.factory('MessagesProvider', function messagesProvider($ionicPopup) {

    return {
        // A simple function to handle errors using friendly popup message
        alertPopup: function(message, title) {
            $ionicPopup.alert({
                title: title ? title : 'Oops',
                template: message
            });
        }
    };
});
