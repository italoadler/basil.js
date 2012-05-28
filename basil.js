/**
 * Copyright...
 */
#target "InDesign";

(function(glob, app) {
  var pub = {};

  // ----------------------------------------
  // constants
  pub.VERSION = "0.1";
  pub.CMYK = "CMYK";
  pub.RGB = "RGB";
  pub.PT = "pt";
  pub.PX = "px";
  pub.CM = "cm";
  pub.MM = "mm";
  var ERROR_PREFIX = "### Basil Error -> ",
    WARNING_PREFIX = "### Basil Warning -> ";

  // ----------------------------------------
  // public vars
  pub.width = null;
  pub.height = null;

  // ----------------------------------------
  // private vars
  var currDoc = null,
    currSpread = null,
    currPage = null,
    currLayer = null,
    currUnits = null,
    currColorMode = null,
    currFillColor = null,
    currStrokeColor = null,
    currStrokeTint = null,
    currFillTint = null,
    currStrokeWeight = null;

  // ----------------------------------------
  // global functions

  if (!glob.forEach) {
    glob.forEach = function(collection, cb) {
      for (var i = 0, len = collection.length; i < len; i++) {
        cb(collection[i]);
      }
    };
  }
  

  // ----------------------------------------
  // Environment
  
  /**
   * Sets or possibly creates the current document and returns it. 
   * If the param doc is not given the current document gets set to the active document 
   * in the application. If no document at all is open, a new document gets created.
   * @param  {Document} [doc] The document to set the current document to.
   * @return {Document} The current document instance.
   */
  pub.doc = function(doc) {
    if (doc instanceof Document) {
      currDoc = doc;
      addCurrDocCloseEventListener();
    }
    return currentDoc();
  };

  /**
   * Returns the current page and possibly sets it.
   * @param  {Page|Number} [page] The page or page index to set the current page to.
   * @return {Page} The current page instance.
   */
  pub.page = function(page) {
    if (page instanceof Page) {
      currPage = page;
    } else if (typeof page === 'number') {
      var tempPage = currentDoc().pages[page];
      try {
        tempPage.id;
      } catch (e) {
        error('Page ' + page + ' does not exist.');
      }
      currPage = tempPage;
    }
    return currentPage();
  };

  /**
   * Returns the current spread and possibly sets it.
   * @param  {Spread|Number} [spread] The spread or spread index to set the current spread to.
   * @return {Spread} The current spread instance.
   */
  pub.spread = function(spread) {
    if (spread instanceof Spread) {
      currSpread = spread;
    } else if (typeof spread === 'number') {
      var tempSpread = currentDoc().spreads[spread];
      try {
        tempSpread.id;
      } catch (e) {
        error('Spread ' + spread + ' does not exist.');
      }
      currSpread = tempSpread;
    }
    return currentSpread();
  };

  /**
   * Returns the current layer and possibly sets it.
   * @param  {Layer|String} [layer] The layer or layer name to set the current layer to.
   * @return {Layer} The current page instance.
   */
  pub.layer = function(layer) {
    if (layer instanceof Layer) {
      currLayer = layer;
    } else if (typeof layer === 'string') {
      var layers = currentDoc().layers;
      currLayer = layers.item(layer);
      if (!currLayer.isValid) {
        currLayer = layers.add({name: layer});
      }
    }
    return currentLayer();
  };

  /**
   * Sets the units of the document (like right clicking the rulers).
   * @param  {Constant} supported: PT, PX, CM or MM
   * @return {Constant} current unit setting
   */
  pub.units = function (units) {
    if (!units) return currUnits;

    if (units === pub.CM || 
        units === pub.MM ||
        units === pub.PT || 
        units === pub.PX ) {
      var unitType = null;
      if      (units === pub.CM) unitType = MeasurementUnits.centimeters;
      else if (units === pub.MM) unitType = MeasurementUnits.millimeters;
      else if (units === pub.PT) unitType = MeasurementUnits.points;
      else if (units === pub.PX) unitType = MeasurementUnits.pixels;
      var doc = currentDoc(); 
      with (doc.viewPreferences){
        //* MeasurementUnits.agates
        //* MeasurementUnits.picas
        //* MeasurementUnits.points
        //* MeasurementUnits.inches
        //* MeasurementUnits.inchesDecimal
        //* MeasurementUnits.millimeters
        //* MeasurementUnits.centimeters
        //* MeasurementUnits.ciceros
        horizontalMeasurementUnits = unitType; 
        verticalMeasurementUnits = unitType;
      }
      currUnits = units;
    } else {
      error("Not supported unit");
    }
    return currUnits;
  }

  // ----------------------------------------
  // Shape
  /**
   * Draws a rectangle to the page.
   * @param  {Number} Position X
   * @param  {Number} Position Y
   * @param  {Number} Width
   * @param  {Number} Height
   * @return {Rectangle}   new Rectangle
   */
  pub.rect = function(x, y, w, h){
    var rectBounds = [];
    rectBounds[0] = y;
    rectBounds[1] = x;
    rectBounds[2] = (y+h);
    rectBounds[3] = (x+w);
    var newRect = currentPage().rectangles.add( currentLayer() );
    with(newRect) {
      geometricBounds = rectBounds;
      strokeWeight = currStrokeWeight;
      strokeTint = currStrokeTint;
      fillColor = currFillColor;
      fillTint = currFillTint;
      strokeColor = currStrokeColor;
    }
    return newRect;
  };


  // ----------------------------------------
  // Color
  /**
   * Sets the color mode of basil, supported: CMYK or RGB.
   * @param  {Object} new color mode (optional)
   * @return {Object} current color mode
   */
  pub.colorMode = function(colorMode) {
    if (!colorMode) return currLayer;

    if (colorMode === pub.CMYK || colorMode === pub.RGB) {
      currColorMode = colorMode;
    } else {
      error("Not supported color mode");
    }
    return currColorMode;
  };

  // ----------------------------------------
  // Typography
  // FIXME, set color + tint is missing
  pub.text = function(txt, x, y, w, h) {
    var textFrame = currentPage().textFrames.add( currentLayer() );
    textFrame.geometricBounds = [y, x, (y+h), (x+w)];
    textFrame.contents = txt;
    return textFrame;
  };
  

  // ----------------------------------------
  // Math
  var currentRandom = Math.random;
  pub.random = function() {
    if (arguments.length === 0) return currentRandom();
    if (arguments.length === 1) return currentRandom() * arguments[0];
    var aMin = arguments[0],
      aMax = arguments[1];
    return currentRandom() * (aMax - aMin) + aMin
  };

  function Marsaglia(i1, i2) {
    var z = i1 || 362436069,
      w = i2 || 521288629;
    var nextInt = function() {
      z = 36969 * (z & 65535) + (z >>> 16) & 4294967295;
      w = 18E3 * (w & 65535) + (w >>> 16) & 4294967295;
      return ((z & 65535) << 16 | w & 65535) & 4294967295
    };
    this.nextDouble = function() {
      var i = nextInt() / 4294967296;
      return i < 0 ? 1 + i : i
    };
    this.nextInt = nextInt
  }
  Marsaglia.createRandomized = function() {
    var now = new Date;
    return new Marsaglia(now / 6E4 & 4294967295, now & 4294967295)
  };

  pub.randomSeed = function(seed) {
    currentRandom = (new Marsaglia(seed)).nextDouble
  };

  pub.Random = function(seed) {
    var haveNextNextGaussian = false,
      nextNextGaussian, random;
    this.nextGaussian = function() {
      if (haveNextNextGaussian) {
        haveNextNextGaussian = false;
        return nextNextGaussian
      }
      var v1, v2, s;
      do {
        v1 = 2 * random() - 1;
        v2 = 2 * random() - 1;
        s = v1 * v1 + v2 * v2
      } while (s >= 1 || s === 0);
      var multiplier = Math.sqrt(-2 * Math.log(s) / s);
      nextNextGaussian = v2 * multiplier;
      haveNextNextGaussian = true;
      return v1 * multiplier
    };
    random = seed === undef ? Math.random : (new Marsaglia(seed)).nextDouble
  };
    
  pub.map = function(value, istart, istop, ostart, ostop) {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
  };
    
  pub.constrain = function(aNumber, aMin, aMax) {
    return aNumber > aMax ? aMax : aNumber < aMin ? aMin : aNumber;
  };


  // ----------------------------------------
  // Input
  
  pub.findByLabel = function(label) {
    var result = [];
    var doc = currentDoc();
    for (var i = 0, len = doc.pageItems.length; i < len; i++) {
      var pageItem = doc.pageItems[i];
      if (pageItem.label === label) {
        result.push(pageItem);
      }
    }
    return result;
  };


  // ----------------------------------------
  // Output
  
  pub.println = function(msg) {
    $.writeln(msg);
  };

  pub.print = function(msg) {
    $.write(msg);
  };
  

  // ----------------------------------------
  // all private from here

  var init = function() {
    glob.b = pub;

    pub.units(pub.PT);

    // -- init internal state vars --
    currColorMode = pub.CMYK;
    currFillColor = currentDoc().swatches.item("Black"),
    currStrokeColor = currentDoc().swatches.item("Black");
    currStrokeWeight = 1;
    currStrokeTint = 100;
    currFillTint = 100;

    // -- init public vars --
    var pageSize = currentPageSize();
    pub.width = pageSize.width;
    pub.height = pageSize.height;

    welcome();
    runUserScript();
  };

  var runUserScript = function() {
    app.doScript(function() {
      if (typeof glob.setup === 'function') {
        glob.setup();
      }
      if (typeof glob.draw === 'function') {
        glob.draw();
      }      
    }, ScriptLanguage.javascript, undefined, UndoModes.entireScript);
  };

  var welcome = function() {
    $.writeln("basil.js "
        + pub.VERSION
        + " "
        + "infos, feedback @ http://basiljs.ch");
  };
  
  var currentDoc = function() {
    if (!currDoc) {
      try {
        currDoc = app.activeDocument;  
      } catch(e) {
        currDoc = app.documents.add();
      }
      addCurrDocCloseEventListener();
    }
    return currDoc;
  };

  var addCurrDocCloseEventListener = function(doc) {
    currDoc.addEventListener(Event.BEFORE_CLOSE, function() {
      currDoc = null;
      currSpread = null;
      currPage = null;
      currLayer = null;
    });
  }

  var currentLayer = function() {
    if (!currLayer) {
      currentDoc();
      currLayer = app.activeDocument.activeLayer;
    }
    return currLayer;
  };
  
  var currentSpread = function() {
    if (!currSpread) {
      currentDoc();
      currSpread = app.activeWindow.activeSpread;
    }
    return currSpread;
  };
  
  var currentPage = function() {
    if (!currPage) {
      currentDoc();
      currPage = app.activeWindow.activePage;
    }
    return currPage;
  };

  var currentPageSize = function () {
    var pageBounds = currentPage().bounds; // [y1, x1, y2, x2]
    var w = pageBounds[3] - pageBounds[1];
    var h = pageBounds[2] - pageBounds[0];
    return {width: w, height: h};
  };

  var error = function(msg) {
    $.writeln(ERROR_PREFIX + msg);
    throw msg;
  };

  var warning = function(msg) {
    $.writeln(WARNING_PREFIX + msg);
  };
  
  init();
  
})(this, app);