angular.module('portfolio.controllers', [])

/**
 * Generic application controller
 */
.controller('AppController', function($scope, $state, $ionicPopup, LocalStorageProvider, PersistentStorageProvider) {

  $scope.logout = function() {
    $ionicPopup.confirm({
      title: 'Logout',
      template: 'Logging out will remove all artworks from your device. Are you sure?'
    }).then(function(response) {
      if (response) {
        PersistentStorageProvider.purge(function(){
          LocalStorageProvider.purge();
          $state.go('intro.welcome');
        });
      }
    });

  };

  $scope.submitSubscriber = function() {
    // TODO: Implement the subscription logic
    var alertPopup = $ionicPopup.alert({
      title: 'Add subscriber',
      template: 'Thank you for subscription'
    });
  };

})

/**
 * Handles artworks listing
 */
.controller('ArtworksController', function($scope, $stateParams, ArtworkProvider, CollectionProvider) {
  // Init artworks
  ArtworkProvider.init();

  $scope.viewTitle = 'Artworks';
  $scope.ref = 'artworks';
  $scope.refId = 0;

  // Display artworks that belong to collection...
  if ($stateParams.collectionId) {
    var collection = CollectionProvider.findById($stateParams.collectionId);
    $scope.artworks = ArtworkProvider.allByCollection(collection);
    $scope.viewTitle = collection.name;
    $scope.ref = 'collection';
    $scope.refId = collection.id;

  // ...or display them all
  } else {
    $scope.artworks = ArtworkProvider.all();
  }
})

/**
 * Handles collections listing
 */
.controller('CollectionsController', function($scope, CollectionProvider) {
    $scope.collections = CollectionProvider.all();
})

/**
 * A single artwork view controller
 */
.controller('ArtworkDetailsController', function($scope, $state, $stateParams, $ionicModal, ArtworkIteratorProvider, ArtworkProvider, CollectionProvider) {

  $scope.artwork = ArtworkProvider.findById($stateParams.artId);

  // Define artwork set to help browsing
  var artworkSet = [];
  if ($stateParams.ref == 'collection') {
    var collection = CollectionProvider.findById($stateParams.refId);
    artworkSet = ArtworkProvider.allByCollection(collection);
  } else {
    artworkSet = ArtworkProvider.all();
  }

  // Handle browsing through multiple artworks within given context
  ArtworkIteratorProvider.init(artworkSet, $stateParams.artId);

  $scope.loadPrev = function() {
    $state.go('artwork.artwork', {artId: ArtworkIteratorProvider.prevId()});
  };

  $scope.loadNext = function() {
    $state.go('artwork.artwork', {artId: ArtworkIteratorProvider.nextId()});
  };

  // Handle "Back" button depending whether we're in collections or artworks context
  $scope.goBack = function() {
    if ($stateParams.ref == 'collection') {
      $state.go('portfolio.bycollection', {collectionId: $stateParams.refId});
    } else {
      $state.go('portfolio.artworks');
    }
  };

  // Handle modal overlay with artwork details
  $ionicModal.fromTemplateUrl('templates/artwork/modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
  });

  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });

  $scope.displayArtworkInfo = function($event) {
    $scope.modal.show($event);
  };

  $scope.closeArtworkInfo = function() {
    $scope.modal.hide();
  };

  $scope.shareArtwork = function(artworkUrl) {
    window.plugins.socialsharing.share('Hi there, check out my artwork!', null, artworkUrl, 'http://www.artfinder.com');
  };

})

.controller('IntroController', function($scope) {

})

/**
 * Controller which handles initial user login action
 * - fetches json data from webservice
 * - saves data into local storage
 * - redirects to the next step (FetcherController)
 */
.controller('LoginController', function($scope, $state, $ionicPopup, $ionicLoading, RemoteDataProvider, LocalStorageProvider, MessagesProvider) {

  // A generic error handler for logging process
  var errorHandler = function(err, context, callback) {
    var genericErrorMessage = 'An unexpected error occurred while logging in. Perhaps you are not connected to the internet?';
    if (err.status && err.status == 404) {
      switch (context) {
        case 'auth':
          MessagesProvider.alertPopup('The login details are incorrect. Please try again.');
          break;
        case 'collections':
          console.log('No collections returned');
          callback();
          break;
        default:
          MessagesProvider.alertPopup(genericErrorMessage);
      }
    } else {
      MessagesProvider.alertPopup(genericErrorMessage);
    }
  };

  // Helper function to redirect upon successful login
  var redirectToFetcher = function() {
    $ionicLoading.hide();
    $state.go('intro.fetch');
  };

  // Login entry point
  $scope.login = function(user) {

    if (!user || !user.slug) {
      return MessagesProvider.alertPopup('Please provide username/slug');
    }
    if (!user.code) {
      return MessagesProvider.alertPopup('Please provide verification code');
    }

    $ionicLoading.show({
      template: 'Logging in...'
    });

    var username = user.slug;

    // Fetch login details, compare with details entered by user
    RemoteDataProvider.fetchAuthDataForUser(username).then(function(data_user) {
      if (data_user.data.auth.toLowerCase() != user.code.toLowerCase()) {
        MessagesProvider.alertPopup('The login details are incorrect. Please try again.');
        $ionicLoading.hide();
        return;
      }

      // Fetch artworks and save response to local storage
      RemoteDataProvider.fetchArtworksForUser(username).then(function(data_arts) {
        if (!data_arts.data.objects || data_arts.data.objects.length === 0) {
          MessagesProvider.alertPopup('It appears that you have no artworks in your portfolio.');
        } else {
          LocalStorageProvider.saveUsername(username);
          LocalStorageProvider.saveRawArtworksData(data_arts.data.objects);

          // Fetch collections and save response to local storage
          RemoteDataProvider.fetchCollectionsForUser(username).then(function(data_cols){
            if (data_cols.data.objects && data_cols.data.objects.length > 0) {
              LocalStorageProvider.saveRawCollectionsData(data_cols.data.objects);
            }

            // Redirect to intro.fetch view to begin artwork/collections fetching
            redirectToFetcher();

          // TODO: Not sure whether we should allow empty collections...?
          // Need to check that with Gump
          }, function(e) { errorHandler(e, 'collections', redirectToFetcher); });
        }
      }, function(e) { errorHandler(e, 'artworks'); });
    }, function(e) { errorHandler(e, 'auth'); });
  };
})

/**
 * A controller which handles actual artworks fetching to local persistent storage
 * - reads json data from local storage (saved at the login step)
 * - recursively fetches artworks images and passes to storage service to save locally
 * - updates artworks json dada with paths leading to locally stored images
 */
.controller('FetcherController', function($scope, $state, $ionicLoading, LocalStorageProvider, PersistentStorageProvider, RemoteDataProvider, MessagesProvider, ArtworkProvider) {

  var rawArts = LocalStorageProvider.getRawArtworksData();
  var numOfArtworks = rawArts.length;
  var username = LocalStorageProvider.getUsername();
  var killswitch = 0;

  // Cancel ongoing, recursive fetch process
  // Sets the killswitch to tell recursive function that process needs to stop
  $scope.cancel = function() {
    killswitch = 1;
    $ionicLoading.show({
      template: 'Aborting dowload process, please wait...'
    });
  };

  // Helper method to update progress status
  var updateStatus = function(count, type) {
    $scope.statusTxt = count + '/' + numOfArtworks + ' ' + type;
  };

  // Helper method to generate filename
  var filename = function(type, artIdx, imgIdx) {
    return username + '-' + type + '-' + artIdx + '-' + imgIdx + '.jpg';
  };

  // Helper method for handling errors
  var handleError = function(type, artIdx, imgIdx, error) {
    console.log('Error getting ' + type + ', artwork no: ' + artIdx + ', file no: ' + imgIdx + '. Error: ' + error.toString());
    killswitch = 1;
    MessagesProvider.alertPopup('An unexpected error occurred when downloading your artworks. Please try again.', 'Oops,');
    fetchAndSave(artIdx, imgIdx);
  };

  // Recursive function to fetch binary images and save in persistent storage
  var fetchAndSave = function(artIdx, imgIdx, type) {

    // Abort execution grecefully when killswitch is on
    if (killswitch > 0) {
      console.log('Aborting - killswitch: ' + killswitch);
      PersistentStorageProvider.purge(function() {
        LocalStorageProvider.purge();
        $ionicLoading.hide();
        $state.go('intro.welcome');
      });
      return;
    }

    if (rawArts[artIdx]) {

      //TODO: Fix opening cover_image instead of images in 'collections' type
      if (rawArts[artIdx].images[imgIdx]) {

        updateStatus(artIdx+1, type);
        var img = rawArts[artIdx].images[imgIdx];

        // Fetch grid_medium...
        RemoteDataProvider.fetchBlob(img.grid_medium.url).then(function(data){

          // ...save grid_medium to persistent storage.
          console.log('save ' + type + '_grid_medium ' + artIdx + '-' + imgIdx + ', data.size: ' + data.data.size);
          PersistentStorageProvider.saveBlob(data.data, filename(type + '_grid_medium', artIdx, imgIdx), function(file) {
            rawArts[artIdx].images[imgIdx].grid_medium.local_path = file.toURL();

            // Fetch fluid_large...
            RemoteDataProvider.fetchBlob(img.fluid_large.url).then(function(data) {

              // ...save fluid_large to persistent storage.
              console.log('save ' + type + '_fluid_large ' + artIdx + '-' + imgIdx + ', data.size: ' + data.data.size);

              PersistentStorageProvider.saveBlob(data.data, filename(type + '_fluid_large', artIdx, imgIdx), function(file) {
                rawArts[artIdx].images[imgIdx].fluid_large.local_path = file.toURL();

                // Populate cover_image attribute for artwork
                if (imgIdx === 0) {
                  rawArts[artIdx].cover_image = rawArts[artIdx].images[imgIdx].fluid_large;
                }

                // Carry on to the next image in the current artwork
                fetchAndSave(artIdx, imgIdx+1, type);
              });

            }, function(error){
              handleError(type + '_fluid_large', artIdx, imgIdx, error);
            });

          });

        }, function(error){
          handleError(type + '_grid_medium', artIdx, imgIdx, error);
        });

      } else {
        // Carry on to the next artwork
        fetchAndSave(artIdx+1, 0, type);

      } // ENDOF: if (rawArts[artIdx].images[imgIdx])

    } else {
      console.log('Fetch process type: ' + type + ' completed. ArtIdx:' + artIdx + ', imgIdx: ' + imgIdx);
      if (type == 'artworks') {
      // Fetching process finished:
        // - save json artworks data to local storage
        // - initialize ArtworkProvider
        // - proceed collections
        LocalStorageProvider.saveArtworksData(rawArts);

        proceedFetchAndSaveCollections();
      }
      else if (type == 'collections') {
      // Fetching process finished:
        // - save json artworks data to local storage
        // - redirect
        LocalStorageProvider.saveCollectionsData(rawArts);
        $state.go('intro.complete');
      }
      else {
      handleError(type, artIdx, imgIdx, 'Unsupported type in fetch completion');
      }
    } // ENDOF: if (rawArts[artIdx])
  };

  var proceedFetchAndSaveCollections = function() {
  rawArts = LocalStorageProvider.getRawCollectionsData();
    numOfArtworks = rawArts.length;

    fetchAndSave(0, 0, 'collections');
  }

  // Start recursive fetching process
  fetchAndSave(0, 0, 'artworks');

})

.controller('SplashScreenController', function($state, $timeout, LocalStorageProvider) {

  $timeout(function() {
    $state.go(LocalStorageProvider.getUsername() === null ? 'intro.welcome' : 'portfolio.artworks');
  }, 2000, false);

});
