//= require <qubit/GLOBAL>
//= require <qubit/PaymentInvoice>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.date.locale");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.form.ComboButton");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.Form");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.data.ClientFilter");
dojo.require("dojox.data.JsonRestStore");

dojo.addOnLoad(function () {
  dojo.declare("qubit.PaymentHistory", [ dijit._Widget, dijit._Templated ], {
    widgetsInTemplate : true,
    title : "PaymentHistory",
    templateString : dojo.cache("qubit.templates", "PaymentHistory.html?cb=" + 
        qubit.v),
    postCreate : function () {
      this.setupDataGrid();
      this.setupYearDropDown();
    },
    setupDataGrid : function () {
      var layout, transactions, phStore, removePadding, padding = 14;
      removePadding = dojo.isIE || dojo.isChrome >= 19;
      layout = [ {
        field : 'date',
        name : 'Date',
        width : (100 - (removePadding ? padding : 0)) + 'px',
        formatter: function (value) {
          var parsed = dojo.date.locale.parse(value, {
            datePattern: "yyyy-MM-dd",
            selector: "date"
          });
          return dojo.date.locale.format(parsed, {
            selector: "date"
          });
        }
      }, {
        field : 'pageViews',
        name : 'Page Views',
        width : (110 - (removePadding ? padding : 0)) + 'px',
        classes: "right",
        formatter: function (pv) {
          return dojo.number.format(pv, {places: 2, fractional: false});
        }
      }, {
        field : '_item',
        name : 'Amount',
        width : (110 - (removePadding ? padding : 0)) + 'px',
        classes: "right",
        formatter: function (invoice) {
          return dojo.number.format(invoice.amount, {places: 2}) + " " +
            invoice.currencyCode;
        }
      }, {
        field : 'transactionId',
        name : 'Transaction ID',
        width : (240 - (removePadding ? padding : 0)) + 'px',
        classes: "center"
      }, {
        field : "*",
        name : " ",
        width : (100 - (removePadding ? padding : 0)) + 'px',
        classes: "center",
        formatter: function () {
          return "view details &#187;";
        }
      } ];
      phStore = new dojox.data.JsonRestStore({
        target : "qdashboard/invoice/billingRecords"
      });
      this.dataGrid = new dojox.grid.DataGrid({
        structure : layout,
        store : phStore,
        autoHeight : 5,
        rowHeight : 35,
        autoWidth : true,
        clientSort : true,
        editable : false,
        queryOptions: {cache: true}
      });
      this.dataGrid.onFetchError = function (e) {
        console.debug(e);
      };

      this.paymentHistoryData.appendChild(this.dataGrid.domNode);
      this.dataGrid.startup();
      dojo.connect(this.dataGrid, "onRowClick", this, this.openInvoice);
    },
    setupYearDropDown : function () {
      var button, yearStore, menu;
      yearStore = new dojox.data.JsonRestStore({
        target : "qdashboard/invoice/billingYears"
      });
      menu = new dijit.Menu({
        style: "display: none;"
      });
      button = new dijit.form.DropDownButton({
        label: "Year",
        dropDown: menu,
        "class": "subtle"
      });
      yearStore.dataGrid = this.dataGrid;
      yearStore.dropDownButton = button;
      yearStore.fetch({
        onItem : function (year, args) {
          var menuItem1 = new dijit.MenuItem({
            label: year,
            onClick: function () {
              this.dataGrid.setQuery("?year=" + year);
              this.dropDownButton.set('label', year);
            }
          });
          menuItem1.dataGrid = this.dataGrid;
          menuItem1.dropDownButton = this.dropDownButton;
          menu.addChild(menuItem1);
        },
        onComplete: function (dummy, args) {
          var years = args.results;
          if (years[0]) {
            this.dataGrid.setQuery("?year=" + years[0]);
            this.dropDownButton.set('label', years[0]);
          }
          this.dataGrid.render();
        }
      });
      button.placeAt(this.paymentHistoryYearSelector);
    },
    openInvoice : function (e) {
      var invoice;
      invoice = e.grid.getItem(e.rowIndex);
      this.invoicePage = new qubit.PaymentInvoice({invoice: invoice});
      this.hide();
      this.invoicePage.show();
    },
    show : function () {
      this.visible = true;
      this.payment_history_container.show();
    },
    hide : function () {
      this.visible = false;
      this.payment_history_container.hide();
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/Notification>
//= require <qubit/Helper>

(function () {
  
  var Notification = qubit.Notification;
  
  function NotificationManager(config) {
    if (config) {
      this.maxTime = +config.maxTime || 60 * 1000;
      this.notifiers = {};
      this.className = config.className;
      this.parentContainer = config.parentContainer || document.body;
      this.container = config.container || document.createElement("div");
      this.init();
    }
  }

  NotificationManager.prototype.notify = 
    function (notifer, msg, maxtime, classSuffix, closeable) {
      if (!this.notifiers[notifer]) {
        var notification = new Notification({
            parentContainer: this.container,
            maxTime: maxtime,
            className: classSuffix,
            closeable: closeable
          }),
          _this = this;

        notification.onDestroy = function () {
          delete _this.notifiers[notifer];
        };

        this.notifiers[notifer] = notification;
        notification.paint();
      }
      
      this.notifiers[notifer].show();
      this.notifiers[notifer].setContent(msg);
      this.notifiers[notifer].timestamp = new Date().valueOf();
    };

  NotificationManager.prototype.done = function (notifer, msg, timeout) {
    this.notify(notifer, msg);
    var _this = this;
    setTimeout(function () {
      if (_this.notifiers[notifer]) {
        _this.notifiers[notifer].destroy();
        delete _this.notifiers[notifer];
      }
    }, timeout);
  };

  NotificationManager.prototype.init = function () {
    this.setParentContainer(this.parentContainer);
    var _this = this, loop;
    loop = function () {
      if (_this.container && _this.container.parentNode) {
        _this.oldNotifiersCheck();
        setTimeout(loop, 500);
      }
    };
    loop();
  };

  NotificationManager.prototype.setParentContainer =
    function (parentContainer) {
      this.parentContainer = parentContainer;
      this.parentContainer.appendChild(this.container);
      if (this.container.className
              .lastIndexOf(" qubit-notificationmanager" === -1)) {
        this.container.className += " qubit-notificationmanager " +
          this.className;
      }
    };

  NotificationManager.prototype.oldNotifiersCheck = function () {
    var prop, maxtime;
    for (prop in this.notifiers) {
      if (this.notifiers.hasOwnProperty(prop)) {
        maxtime = this.notifiers[prop].maxTime || this.maxTime;
        if ((new Date().valueOf() - this.notifiers[prop].timestamp) > 
            maxtime) {
          this.notifiers[prop].destroy();
        }
      }
    }
  };

  NotificationManager.prototype.clear = function () {
    var prop;
    for (prop in this.notifiers) {
      if (this.notifiers.hasOwnProperty(prop)) {
        this.notifiers[prop].destroy();
      }
    }
  };

  window.qubit.NotificationManager = NotificationManager;

//initialization for the engine

  qubit.Helper.waitForBody(function () {
    qubit.DefaultNotificationsMgr = new NotificationManager({
      maxTime: 3 * 1000
    });
  });

}());
//= require <qubit/GLOBAL>
//= require <qubit/PaymentHistory>
//= require <qubit/data/Invoice>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.number");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.form.ComboButton");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.Form");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.data.ClientFilter");
dojo.require("dojox.data.JsonRestStore");

dojo.addOnLoad(function () {
  dojo.declare("qubit.PaymentInvoice", [ dijit._Widget, dijit._Templated ], {
    widgetsInTemplate : true,
    title : "PaymentInvoice",
    templateString : dojo.cache("qubit.templates", "PaymentInvoice.html?cb=" + 
        qubit.v),
    postCreate : function () {
      dojo.connect(this.returnToHistoryLink, "onclick",
          this, this.returnToBillingHistory);
      this.setupData();
    },
    setupData : function () {
      this.invoice_date.innerHTML = this.formatDate(this.invoice);
      this.invoice_number.innerHTML = this.formatInvoiceNumber(this.invoice);
      this.client_details.innerHTML = this.formatClientDetails(this.invoice);
      this.invoice_summary_total.innerHTML = 
        this.formatSummaryTotal(this.invoice);
      this.invoice_pageviews.innerHTML = this.formatPageViews(this.invoice);
      this.invoice_total.innerHTML = this.formatInvoiceTotal(this.invoice);
      this.invoice_amount_owed.innerHTML =
        this.formatInvoiceAmountOwed(this.invoice);
      qubit.data.Invoice.getInvoiceBreakdown(this.invoice.invoiceId,
        dojo.hitch(this, this.showInvoiceLines));
    },
    showInvoiceLines : function (invoiceLines) {
      this.invoice_lines.innerHTML = this.formatInvoiceLines(invoiceLines);
    },
    formatDate : function (invoice) {
      var parsed = dojo.date.locale.parse(invoice.date, {
        datePattern: "yyyy-MM-dd",
        selector: "date"
      });
      return dojo.date.locale.format(parsed, {
        selector: "date"
      });
    },
    formatInvoiceNumber: function (invoice) {
      return "#" + invoice.invoiceId;
    },
    formatClientDetails: function (invoice) {
      var html;
      html = "To:<br />Country: " + invoice.country;
      html += "<br />VAT: " + invoice.vatNumber;
      return html;
    },
    formatSummaryTotal: function (invoice) {
      var html;
      html = this.getAmount(invoice) + "<br />";
      if (invoice.paid) {
        html = html + "PAID"; 
      }
      return html;
    },
    formatPageViews: function (invoice) {
      return dojo.number.format(invoice.pageViews, {
        places: 2,
        fractional: false
      }) + " PAGEVIEWS";
    },
    formatInvoiceLines: function (invoiceLines) {
      var html, amount, i, invoiceLine;
      html = "";
      for (i = 0; i < invoiceLines.length; i = i + 1) {
        invoiceLine = invoiceLines[i];
        amount = this.getAmount(invoiceLine, this.invoice.currencyCode);
        if (invoiceLine.creditDebit === "CR") {
          amount = "-" + amount;
        }
        html = html + "<div class=\"row borderBottom\">" +
          "  <div class=\"eightcol\">" + invoiceLine.description + "</div>" +
          "  <div class=\"fourcol right last\">" + amount + "</div>" +
          "</div>";
      }
      return html;
    },
    formatInvoiceTotal: function (invoice) {
      return this.getAmount(invoice);
    },
    formatInvoiceAmountOwed: function (invoice) {
      if (invoice.paid) {
        return "0.00 " + invoice.currencyCode; 
      } else {
        return this.getAmount(invoice);
      }
    },
    returnToBillingHistory : function (e) {
      this.billingHistoryPage = new qubit.PaymentHistory();
      this.hide();
      this.billingHistoryPage.show();
    },
    show : function () {
      this.visible = true;
      this.payment_invoice_container.show();
    },
    hide : function () {
      this.visible = false;
      this.payment_invoice_container.hide();
    },
    getAmount: function (invoice, currencyCode) {
      if (!currencyCode) {
        currencyCode = invoice.currencyCode;
      }
      return dojo.number.format(invoice.amount, {places: 2}) + " " +
        currencyCode;
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/qfeedback/Dashboard>
dojo.require("dijit.layout.TabContainer");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qfeedback.QExit", [dijit.layout.TabContainer], {
    title: "QExit",
    postCreate: function () {
      
      dojo.forEach(this.getContents(), dojo.hitch(this, 
        function (contentPaneData) {
          var paneData;
          paneData = {
            title: contentPaneData.title
          };
          
          if (typeof (contentPaneData.Content) === "string") {
            paneData.content =  contentPaneData.Content;
            this.addChild(new dijit.layout.ContentPane(paneData));
          } else {
            this.addChild(new contentPaneData.Content());
          }
        
        }));
    },
    getContents: function () {
      return [
        {
          title: "Dashboard",
          Content: qubit.qfeedback.Dashboard
        },
        {
          title: "Traffic Sources",
          Content: "Dash it all1"
        },
        {
          title: "Page Categories",
          Content: "Dash it all2"
        },
        {
          title: "Topics",
          Content: "Dash it all3"
        }
      ];
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/qfeedback/data/Timebucket>
//= require <qubit/graph/Graph>
//= require <qubit/graph/FeedbackViewer>

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qfeedback.Dashboard", [dijit._Widget, dijit._Templated], {
    //widgetsInTemplate: true,
    title: "Dashboard",
    templateString: 
      "<div " +
      "    class='qubit_qfeedback_Dashboard' " +
      "    dojoAttachPoint='containerNode' " +
      "    dojoType='dijit.layout.ContentPane'" +
      ">" +
      "</div>",
    postCreate: function () {
      this.createSummaryTimeline();
      this.createGroupedGraph();
      this.createDetailedTimeline();
      this.createHeatmap();

      var x = new qubit.graph.FeedbackViewer().placeAt(this.createHolder());
    },
    createSummaryTimeline: function () {
      qubit.graph.Graph.createGraph(
        new qubit.qfeedback.data.ChartData(
          [new Date(2011, 2, 1), new Date(2011, 3, 1)],
          qubit.qfeedback.data.Timebucket.day
        ), 
        this.createHolder()
      );
    },
    createDetailedTimeline: function () {
      qubit.graph.Graph.createDetailedGraph(
        new qubit.qfeedback.data.ChartData(
          [new Date(2011, 2, 1), new Date(2011, 3, 1)],
          qubit.qfeedback.data.Timebucket.day
        ), 
        this.createHolder()
      );
    },
    createGroupedGraph: function () {
      qubit.graph.Graph.createGraph(
        new qubit.qfeedback.data.ChartData(
          [new Date(2011, 1, 1), new Date()],
          qubit.qfeedback.data.Timebucket.all,
          [qubit.qfeedback.data.DataManager.trafficsource]
        ), 
        this.createHolder()
      );
    },
    createHeatmap: function () {
      qubit.graph.Graph.createGraph(
        new qubit.qfeedback.data.ChartData(
          [new Date(2011, 1, 1), new Date()],
          qubit.qfeedback.data.Timebucket.all,
          [ qubit.qfeedback.data.DataManager.trafficsource, 
            qubit.qfeedback.data.DataManager.pagecategory ]
        ),
        this.createHolder()
      );
    },
    createHolder: function () {
      var holder = document.createElement("div");
      holder.id = "chart1";
      holder.style.width = "400px";
      holder.style.height = "400px";
      holder.style.cssFloat = "left";
      this.containerNode.appendChild(holder);
      return holder;
    }
  });
});
//= require <qubit/GLOBAL>
dojo.addOnLoad(function () {
  dojo.declare("qubit.qfeedback.data.FeedbackSentiment", null, {
    constructor: function () {
      
    }
  });
  qubit.qfeedback.data.FeedbackSentiment.all = -1;
});
//= require <qubit/qfeedback/data/_Category.js>
dojo.declare("qubit.qfeedback.data.PageCategory", 
  [qubit.qfeedback.data._Category], {});
//= require <qubit/qfeedback/data/_Category.js>
dojo.declare("qubit.qfeedback.data.FeedbackCategory", 
  [qubit.qfeedback.data._Category], {});
//= require <qubit/qfeedback/data/_Category.js>
dojo.declare("qubit.qfeedback.data.TrafficSource", 
  [qubit.qfeedback.data._Category], {});
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/qfeedback/data/FeedbackSentiment>
//= require <qubit/qfeedback/data/ChartData>
//= require <qubit/qfeedback/data/Timebucket>
//= require <qubit/qfeedback/data/PageCategory>
//= require <qubit/qfeedback/data/FeedbackCategory>
//= require <qubit/qfeedback/data/TrafficSource>
//= require <qubit/qfeedback/data/FeedbackDetail>

/*global data */ 
dojo.addOnLoad(function () {
  dojo.declare("qubit.qfeedback.data._DataManager", null, {
    mockDb: false,
    mockTimeout: false,
    constructor: function () {
      this.loaders = [];
      this.onLoadCallbacks = [];
      this.loadInitialData();
    },
    loaded: function () {
      return dojo.every(this.loaders, function (loader) {
        return loader.fired >= 0;
      });
    },
    onload: function () {
      if (this.loaded()) {
        dojo.forEach(this.onLoadCallbacks, function (cb) {
          cb();
        });
        this.onLoadCallbacks = [];
      }
    },
    addOnLoad: function (cb) {
      if (this.loaded()) {
        cb();
      } else {
        this.onLoadCallbacks.push(cb);
      } 
    },
    createDeferred: function () {
      var d = new dojo.Deferred();
      this.loaders.push(d);
      d.then(dojo.hitch(this, this.onload));
      return d;
    },
    loadInitialData: function () {
      this.loadCategories("/PageCategories", 
          qubit.qfeedback.data.PageCategory, 
        "pageCategories", [{
          id: 0,
          name: "Home",
          desc: "description"
        }, {
          id: 1,
          name: "Product",
          desc: "description"
        }, {
          id: 2,
          name: "Article",
          desc: "description"
        }]);
      this.loadCategories("/TrafficSourceCategories", 
          qubit.qfeedback.data.TrafficSource, "trafficSources", [{
          id: 0,
          name: "Organic",
          desc: "description"
        }, {
          id: 1,
          name: "SEM",
          desc: "description"
        }, {
          id: 2,
          name: "Referred",
          desc: "description"
        }]);
      this.loadCategories("/FeedbackCategories", 
          qubit.qfeedback.data.FeedbackCategory, "feedbackCategories", [{
          id: 0,
          name: "Pricing",
          desc: "description"
        }, {
          id: 1,
          name: "Delivery Methods",
          desc: "description"
        }, {
          id: 2,
          name: "Navigation",
          desc: "description"
        }]);
    },
    loadCategories: function (url, Type, variable, mockData) {
      var d = this.createDeferred();
      if (!this.mockDb) {
        dojo.xhrGet({
          url: qubit.data.Urls.domain + qubit.data.Urls.qfeedback + url,
          preventCache: true,
          handleAs: "json",
          handle: dojo.hitch(this, dojo.partial(this.categoriesLoaded, 
              d, Type, variable))
        });
      } else {
        if (this.mockTimeout) {
          setTimeout(dojo.hitch(this, function () {
            this.categoriesLoaded(d, Type, variable, mockData);
          }), 1000);
        } else {
          this.categoriesLoaded(d, Type, variable, mockData);
        }
      }
    },
    categoriesLoaded: function (d, Type, variable, data) {
      var categoryMap = {};
      dojo.forEach(data, function (category) {
        categoryMap[category.id] = new Type(category.id, 
            category.category, category.description);
      });
      this[variable] = categoryMap;
      d.callback(this[variable]);
    },
    getPageCategories: function () {
      return this.pageCategories;
    },
    getTrafficSources: function () {
      return this.trafficSources;
    },
    getFeedbackCategories: function () {
      return this.feedbackCategories;
    },
    getFeedbackSentiments: function (request, cb) {
      dojo.xhrGet({
        url: request.createFeedbackSentimentUrl(),
        preventCache: true,
        handleAs: "json",
        handle: cb
      });
    },
    getSentimentTypes: function () {
      return {
        0: {name: 'Positive'},
        1: {name: 'Neutral'},
        2: {name: 'Negative'}
      };
    },
    getAllSentimentTypes: function () {
      var allTypes = dojo.mixin({}, this.getSentimentTypes());
      allTypes[qubit.qfeedback.data.FeedbackSentiment.all] = {name: 'All'};
      return allTypes;
    }, 
    getMonthNames: function () {
      if (!this.monthNames) {
        this.monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; 
      }
      return this.monthNames;
    },
    getMonthName: function (i) {
      return this.getMonthNames()[i];
    },
    getDataForCategory: function (category) {
      switch (category) {
      case qubit.qfeedback.data.DataManager.trafficsource: 
        return this.getTrafficSources();
      case qubit.qfeedback.data.DataManager.pagecategory:
        return this.getPageCategories();
      case qubit.qfeedback.data.DataManager.feedbackcategory:
        return this.getFeedbackCategories();
      }
    },
    getFeedback: function (cb, pageNumber) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qfeedback + 
          "/Feedback?count=10&page=" + (10 * pageNumber) + 
          "&start=0&end=1301963138820",
        preventCache: true,
        handleAs: "json",
        handle: dojo.hitch(this, dojo.partial(this.feedbackLoaded, cb)) 
      });
    },
    feedbackLoaded: function (cb, feedbacks) {
      cb(dojo.map(feedbacks, dojo.hitch(this, this.createFeedback)));
    },
    createFeedback: function (feedback) {
      console.debug(feedback);
      return new qubit.qfeedback.data.FeedbackDetail(feedback.text,
              feedback.referrer, "Exit url", "paeg views", "bias", 
              feedback.page_category, feedback.traffic_source, 
              feedback.feedback_category, (feedback.visitNumber > 0));
      //To show properly?
      //visitNumber
      //traffic_source
      //feedback_category
      //time
    }
  });
  qubit.qfeedback.data.DataManager = new qubit.qfeedback.data._DataManager();
  qubit.qfeedback.data.DataManager.ungrouped = "ungrouped";
  qubit.qfeedback.data.DataManager.trafficsource = "traffic_source";
  qubit.qfeedback.data.DataManager.pagecategory = "page_category";
  qubit.qfeedback.data.DataManager.feedbackcategory = "feedback_category";
});
//= require <qubit/GLOBAL>
dojo.declare("qubit.qfeedback.data.FeedbackDetail", null, {
  constructor: function (text, referrer, exitUrl, pageViews, bias, 
      pageCategory, trafficSource, feedbackCategory, isReturning) {
    this.text = text;
    this.referrer = referrer;
    this.exitUrl = exitUrl;
    this.pageViews = pageViews;
    this.bias = bias;
    this.pageCategory = pageCategory;
    this.trafficSource = trafficSource;
    this.feedbackCategory = feedbackCategory;
    this.isReturning = isReturning;
  }
});
/*global console*/
//= require <qubit/data/Urls>
dojo.addOnLoad(function () {
  dojo.declare("qubit.qfeedback.data.ChartData", null, {
    constructor: function (duration,
        timebucket,
        groupby,
        constraints) {
      this.duration = duration;
      this.timebucket = timebucket;
      this.groupby = groupby;
      this.constraints = constraints;
    },
    exists: function (x) {
      return (x !== undefined) && (x !== null); 
    },
    createFeedbackSentimentUrl: function () {
      var url = qubit.data.Urls.domain + qubit.data.Urls.qfeedback + 
        "/feedbacksentiment" +
        "?start=" + this.duration[0].getTime() +
        "&end=" + this.duration[1].getTime();
      if (this.timebucket) {
        url += "&timebucket=" + this.timebucket;
      }
      if (this.groupby) {
        dojo.forEach(this.groupby, function (group) {
          url += "&groupby=" + group;
        });
      }
      if (this.constraints) {
        dojo.forEach(
          dojox.lang.functional.keys(this.constraints), 
          dojo.hitch(this, function (key) {
            url += "&" + key + "=" + this.constraints[key]; 
          })
        );
      }
      
      return url;
    }
  });
});
//= require <qubit/GLOBAL>
dojo.addOnLoad(function () {
  dojo.declare("qubit.qfeedback.data.Timebucket", null, {
  });
  
  //Declare constants
  qubit.qfeedback.data.Timebucket.all = "yearly";
  qubit.qfeedback.data.Timebucket.year = "yearly";
  qubit.qfeedback.data.Timebucket.quarter = "quarterly";
  qubit.qfeedback.data.Timebucket.month = "monthly";
  qubit.qfeedback.data.Timebucket.week = "weekly";
  qubit.qfeedback.data.Timebucket.day = "daily";
});
//= require <qubit/GLOBAL>
dojo.declare("qubit.qfeedback.data._Category", null, {
  constructor: function (id, name, description) {
    this.id = id;
    this.name = name;
    this.description = description;
  }
});
//= require <qubit/widget/base/ExpandableListItem>

/**
 * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
 */
(function () {
  var Utils = qubit.widget.utils.Utils,
    log = new qubit.widget.base.Log("SaveHistoryItemBody: ");
  
  /**
   * Widget for history item body rendering.
   * Used typically with SaveHistoryItem widget.
   * 
   * @param config
   * @constructor
   */
  function SaveHistoryItemBody(config) {
    if (config) {
      SaveHistoryItemBody.superclass.call(this, config);
      this.containerBody = this.container.children[1];
      this.tagsNode = this.containerBody.children[0];
      this.variablesNode = this.containerBody.children[1];
      this.filtersNode = this.containerBody.children[2];
      this.othersNode = this.containerBody.children[3];
      if (config.entries) {
        this.setEntries(config.entries);
      }
      this.onLoad = config.onLoad;
      this.serverTime = config.serverTime || new Date().valueOf();
      if (config.profileId) {
        this.loadDataForProfileId(config.profileId);
      }
    }
  }

  SaveHistoryItemBody.superclass = qubit.widget.base.BaseWidget;
  SaveHistoryItemBody.prototype = new SaveHistoryItemBody.superclass();
  SaveHistoryItemBody.prototype.CLASS_NAME = "SaveHistoryItemBody";
  SaveHistoryItemBody.prototype.className +=
          " qubit-widget-save-history-item-body";
  
  /**
   * 
   * @param {type} string
   * @param {type} array
   * @returns {Boolean}
   */
  function stringMatches(string, array) {
    var i = 0;
    for (; i < array.length; i += 1) {
      if (array[i] === string) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * 
   * @param {type} type
   * @param {type} entries
   * @returns {_L6.getFieldChangset.changeset}
   */
  function getFieldChangset(type, entries) {
    var i, entry, added = [], removed = [], edited = [], changeset = {},
      copied = [];
    for (i = 0; i < entries.length; i += 1) {
      entry = entries[i];
      if (stringMatches(entry.message.type, type)) {
        if (entry.message.action === "added") {
          added.push(entry);
        } else if (entry.message.action === "edited") {
          edited.push(entry);
        } else if (entry.message.action === "copied") {
          copied.push(entry);
        } else if (entry.message.action === "removed") {
          removed.push(entry);
        }
      }
    }
    changeset.added = added;
    changeset.edited = edited;
    changeset.copied = copied;
    changeset.removed = removed;
    return changeset;
  }

  function getFieldNameToPrintByType(type) {
    if (type === "script") {
      return {field: "name", description: "script"};
    } else if (type === "profile") {
      return {field: "profile_name", description: "profile"};
    } else if (type === "filter") {
      return {field: "pattern_name", description: "pattern"};
    } else if (type === "scriptparameter") {
      return {field: "name", description: "script parameter"};
    } else if (type === "scriptcopy") {
      return {field: "script_name", description: "script copy"};
    } else if (type === "pagevariable") {
      return {field: "name", description: "page variable"};
    } else if (type === "scriptdependency") {
      return {
        field: "dependency_script_name",
        description: "dependency script"
      };
    }
  }

  function renderChangesType(strBuf, prefix, className, object, getDetail) {
    var fieldDetail = getFieldNameToPrintByType(object.message.type),
      when = Utils.fancyFormatDate(object.timestamp, true, this.serverTime);
    strBuf.push("<div class='");
    strBuf.push(className);
    strBuf.push("'><div class='icon'></div>");//icon block
    strBuf.push("<div class='text'>");
    strBuf.push(prefix);
    if (getDetail) {
      strBuf.push(fieldDetail.description);
      strBuf.push(": ");
    }
    strBuf.push("\"");
    strBuf.push(Utils.secureText(object.message[fieldDetail.field]));
    strBuf.push("\"<div class='mini'>");
    strBuf.push(when);
    strBuf.push("</div>");//end of mini
    strBuf.push("</div>");//end of text
    strBuf.push("</div>");
  }
  
  function makeHTMLForChangeSet(changeSet, getDetail) {
    var i, strBuf = [];
    for (i = 0; i < changeSet.added.length; i += 1) {
      renderChangesType(strBuf, "Added ", "added",
        changeSet.added[i], getDetail);
    }
    for (i = 0; i < changeSet.edited.length; i += 1) {
      renderChangesType(strBuf, "Edited ", "edited",
        changeSet.edited[i], getDetail);
    }
    for (i = 0; i < changeSet.copied.length; i += 1) {
      renderChangesType(strBuf, "Copied in script ", "copied",
        changeSet.copied[i], getDetail);
    }
    for (i = 0; i < changeSet.removed.length; i += 1) {
      renderChangesType(strBuf, "Removed ", "removed",
        changeSet.removed[i], getDetail);
    }
    
    if (strBuf.length === 0) {
      strBuf.push("<div class='text-disabled'>No changes recorded</div>");
    }
    
    return strBuf.join("");
  }

  /**
   * Accepts object with text properties to assigned to the history row.
   * 
   * @param entries {Object} Properties example to be passed (all):
   *  {
   *    version: "96",
   *    activeTags: "6 active tags",
   *    inactiveTags: "7 inactive tags",
   *    creationDate: "Aug 20, 2015",
   *    lastSavedDate: "Jul 24, 2018"
   *  }
   */
  SaveHistoryItemBody.prototype.setEntries = function (entries) {
    log.FINE("SaveHistoryItemBody setEntries with arguments:");
    log.FINE(entries, true);
    try {
      this.tagsChanges = getFieldChangset(["script", "scriptcopy"], entries);
      this.variablesChanges = getFieldChangset(["pagevariable"], entries);
      this.filtersChanges = getFieldChangset(["filter"], entries);
      this.otherChanges = getFieldChangset([
        "scriptdependency",
        "scriptparameter",
        "profile"
      ], entries);

      this.tagsNode.innerHTML =
        makeHTMLForChangeSet(this.tagsChanges);
      this.variablesNode.innerHTML =
        makeHTMLForChangeSet(this.variablesChanges);
      this.filtersNode.innerHTML =
        makeHTMLForChangeSet(this.filtersChanges);
      this.othersNode.innerHTML =
        makeHTMLForChangeSet(this.otherChanges, true);
    } catch (ex) {
      log.ERROR("Error while setting entries for SaveHistoryItemBody:");
      log.ERROR(ex);
    }
    if (this.onLoad) {
      this.onLoad();
    }
  };

  /**
   * 
   * @param {type} profileId
   * @returns {undefined}
   */
  SaveHistoryItemBody.prototype.loadDataForProfileId = function (profileId) {
    log.FINE("SaveHistoryItemBody Loading data for profile Id: " + profileId);
    qubit.qtag.data.dao.ProfileDAO
      .fetchProfileHistoryChanges(profileId, this.setEntries.bind(this));
  };

  /**
   * SaveHistoryItemBody DOM view template.
   * 
   * @type {string}
   */
  SaveHistoryItemBody.prototype.viewTemplate = [
    '<div class="item-head">',

    '<div class="column tags"> Tags ',
    '</div>',
    '<div class="column variables"> Variables ',
    '</div>',
    '<div class="column filters"> Filters ',
    '</div>',
    '<div class="column other"> Other changes ',
    '</div>',

    '</div>',
    '<div class="item-body">',
    
    '<div class="column tags"> - ',
    '</div>',
    '<div class="column variables"> - ',
    '</div>',
    '<div class="column filters"> - ',
    '</div>',
    '<div class="column other"> - ',
    '</div>',
      
    '</div>'
  ].join('');

  qubit.widget.SaveHistoryItemBody = SaveHistoryItemBody;

}());
//= require <qubit/widget/base/Log>

/*
 * OpenTag, a tag deployment platform
 * Copyright 2011-2013, QuBit Group
 * http://opentag.qubitproducts.com
 */


(function () {

  var FILTER_ATTR_NAME = "ex-classname";
  var log = new qubit.widget.base.Log("Positioning: ");

  function NodeFilter() {

  }

  /**
   * Generic function for filtering entire node sets by regex or function match.
   * Very useful and simple tool for managing hot views and small 
   * "search on typing" features.
   * 
   * @param {type} attribute
   * @param {type} property
   * @param {type} regex
   * @param {type} className
   * @returns {Number}
   */
  NodeFilter.filterElementsByPropertySet =
    function (attribute, property, regex, className, tags) {
      var all = document.getElementsByTagName(tags || "*"),//live list!
        amount = 0,
        i,
        testedProperty,
        subject;
      log.FINE("filterElementsByPropertySet: Filtering with: ");
      log.FINE(arguments, true);
      for (i = 0; i < all.length; i += 1) {
        subject = all[i];
        if (subject.getAttribute(attribute) !== null) {
          testedProperty = typeof (property) === "function" ?
            property(subject) : subject[property];
          if (String(testedProperty).match(regex) && regex) {
            if (subject.getAttribute(FILTER_ATTR_NAME) === null) {
              subject.setAttribute(FILTER_ATTR_NAME, subject.className);
              subject.className += " " + className;
            }
            amount += 1;
          } else if (subject.getAttribute(FILTER_ATTR_NAME) !== null) {
            subject.className = subject.getAttribute(FILTER_ATTR_NAME);
            subject.removeAttribute(FILTER_ATTR_NAME);
          }
        }
      }
      log.FINE("Found " + amount + " nodes.");
      return amount;
    };

  /**
   * Utility to attach to input nodes search listeners, typically its used with
   *  generic search function above (filterElementsByPropertySet).
   *  
   * @param {type} searchNode
   * @param {type} emptyString
   * @returns {undefined}
   */
  NodeFilter.attachListenersToSearch = function (searchNode, emptyString) {
    searchNode.onclick = searchNode.onfocus = function (e) {
      if (!searchNode.wasChanged) {
        searchNode.value = "";
      }
    };

    searchNode.onchange = searchNode.onkeyup = function (e) {
      if (searchNode.value) {
        searchNode.wasChanged = true;
      } else {
        searchNode.wasChanged = false;
      }
    };

    searchNode.onblur = function (e) {
      if (!searchNode.wasChanged) {
        searchNode.value = emptyString;
      }
    };
  };

}());
//= require <qubit/widget/base/Function>
//= require <qubit/widget/base/Log>

(function () {
  
  var log = new qubit.widget.base.Log("Utils: ");
  
  /**
   * Utility class for Widgets use.
   * 
   * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
   */
  function Utils(config) {
  }
  
  
  /**
   * Months array. Starts from 0.
   */
  Utils.MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
    "Oct", "Nov", "Dec"];
  
  /**
   * Function detecting if given date is today relatively to "now"
   * @param {type} now
   * @param {type} date
   * @returns {Boolean}
   */
  Utils.today = function (now, date) {
    var tstamp = now - date, hrs24 = 24 * 60 * 60 * 1000;
    if (tstamp <= hrs24) {
      return (new Date(+now).getUTCDate() - new Date(+date)
                .getUTCDate()) === 0;
    } else {
      return false;
    }
  };
  
  /**
   * Function detecting if given date is yesterday relatively to "now"
   * @param {type} now
   * @param {type} date
   * @returns {Boolean}
   */
  Utils.yesterday = function (now, date) {
    var hrs24 = 24 * 60 * 60 * 1000;
    return Utils.today(+now, +date + hrs24);
  };
  
  /**
   * Fancy date format function. It does detect recent time for:
   * seconds, minutes, today, yesterday, on date - ago.
   * 
   * @param {type} time
   * @returns {String} Formatted fancy date.
   */
  Utils.fancyFormatDate = function (time, precise, relativeTime) {
    var date = new Date(time), now, nowTime, message, minutes, minutesAgo,
      secondsAgo, s;
    
    now = isNaN(+relativeTime) ? new Date() : new Date(+relativeTime);
    nowTime = now.valueOf();
    
    if (time < 0) {
      return "-";
    }
    
    if (60 * 1000 > (nowTime - time)) {
      secondsAgo = Math.floor((nowTime - time) / 1000); 
      s = (secondsAgo === 1) ? "" : "s"; 
      message = secondsAgo + " second" + s + " ago.";
    } else if (60 * 60 * 1000 > (nowTime - time)) {
      minutesAgo = Math.floor((nowTime - time) / (60 * 1000));
      s = (minutesAgo === 1) ? "" : "s"; 
      message = minutesAgo + " minute" + s + " ago.";
    } else {
      
      minutes = (date.getMinutes() > 9) ?
        date.getUTCMinutes() : "0" + date.getUTCMinutes();
      
      if (Utils.today(now, date)) {
        message = "Today at " + date.getUTCHours() + ":" +
          minutes;
      } else if (Utils.yesterday(now, date)) {
        message = "Yesterday at " + date.getUTCHours() + ":" +
          minutes;
      } else {
        message = Utils.MONTHS[date.getMonth()] +
          " " + date.getUTCDate() + ", " + date.getFullYear();
        if (precise) {
          message = (date.getUTCHours() + ":" + minutes) + ", " + message;
        }
      }
    }
    
    return message;
  };
  
  /**
   * Loads iframe to page.
   * @param {type} href
   * @returns {undefined}
   */
  Utils.loadIframe = function (href, className, id) {
    var iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    iframe.src = href;
    iframe.id = id;
    iframe.setAttribute("width", "100%");
    iframe.setAttribute("height", "100%");
    Utils.addClass(iframe, className);
    return iframe;
  };
  
  /**
   * Simple add style loader.
   * @param {type} href
   * @returns {undefined}
   */
  Utils.loadCSSLink = function (href) {
    var element = document.createElement("link");
    element.rel = "stylesheet";
    element.type = "text/css";
    element.href = href;
    document.getElementsByTagName("head")[0].appendChild(element);
  };
  

  /**
   * Very generic host name with port getter for URL, its protocol flexible.
   * 
   * @param {type} string
   * @returns Array of parts [protocol, host, port, path]
   */
  Utils.getUrlParts = function (string) {

    if (string.charAt(0) === '/' || string.indexOf(" ") !== -1) {
      return [null, null, null, string]; //invalid url
    }

    var parts = string.split(":"),
      noProtocol = true,
      noNumber = false,
      returnedParts = [],
      current,
      hostParts,
      path,
      i,
      port;
      
    if (parts.length > 1) {
      port = parts[1].split("/")[0];
      if (!port || isNaN(+port)) {
        noNumber = true;
      }
      if (parts[0].match(/^\w+$/) && noNumber) {
        noProtocol = false;
      }
    }

    if (noProtocol) {
      parts = string.split("/");
      returnedParts[0] = null;
    } else {
      returnedParts[0] = parts[0];
      parts.splice(0, 1);
      while (parts[0] !== undefined &&
              (parts[0].match(/^\/+$/) || parts[0] === "")) {
        parts.splice(0, 1);
      }
      parts = parts.join(":").split("/");
    }

    current = 0;
    while (parts[current] === "") {
      current += 1;
    }
    log.FINE("getUrlParts -> Parts:");
    log.FINE([noProtocol, noNumber, parts], true);
    //first CAN be URL
    hostParts = parts[current].split(":");
    current += 1;
    if (hostParts.length > 2) {
      return null;
    } else {
      returnedParts[1] = hostParts[0];
      returnedParts[2] = hostParts[1] || null;
    }

    path = "";
    for (i = current; i < parts.length; i += 1) {
      path += "/" + parts[i];
    }

    returnedParts[3] = path || null;

    return returnedParts;
  };

  // GENERIC
  
  /**
   * Function replacing all matching instances of regex "patterns" in "string" 
   * with "replace" string.
   * 
   * @param {type} string
   * @param {type} pattern
   * @param {type} replace
   * @returns {@exp;string@call;replace}
   */
  Utils.replaceAll = function (string, pattern, replace) {
    return string.replace(new RegExp(pattern, 'g'), replace);
  };
  
  /**
   * Make text secure for innerHTML.
   * 
   * @param {type} string
   * @returns {string} String stripped from &lt; and &gt; chars.
   */
  Utils.secureText = function (string) {
    if (typeof (string) !== "string") {
      string += "";
    }
    string = Utils.replaceAll(string, "<", "&lt;");
    string = Utils.replaceAll(string, ">", "&gt;");
    return string;
  };

  /**
   * ## Utility method getting the browser's URL.
   * @returns {document.location.href}
   */
  Utils.getUrl = function () {
    return document.location.href;
  };

  Utils.getQueryParam = function (param) {
    var i, ii, params, url, query, queries, splitQuery;
    url = Utils.getUrl();
    if (url.indexOf("?") > 0) {
      queries = url.substring(url.indexOf("?") + 1).split("&");
      for (i = 0, ii = queries.length; i < ii; i += 1) {
        query = queries[i];
        if (query.indexOf("=") > 0) {
          splitQuery = query.split("=");
          if ((splitQuery.length === 2) && (splitQuery[0] === param)) {
            return splitQuery[1];
          }
        }
      }
    }
    return null;
  };

  /**
   * 
   * @param {String} elementId
   * @returns {unresolved}
   */
  Utils.getElementValue = function (elementId) {
    var el = document.getElementById(elementId);
    if (el) {
      return el.textContent || el.innerText;
    }
    return null;
  };
  
  //private helper for objectCopy
  var travelArray = [];
  function existsInPath(object, max) {
    for (var i = 0; i < max && i < travelArray.length; i++) {
      if (object === travelArray[i][0]) {
        //console.log(object+"");
        return travelArray[i];
      }
    }
    return false;
  }
  /**
   * Copy object.
   * deep option must be passed to protect from circural references.
   * 
   * @param {Object} obj
   * @param {Number} maxDeep
   * @param {Boolean} lessStrict
   * @param {Number} start DONT Use it.
   * @returns {unresolved}
   */
  Utils.objectCopy = function (obj, maxDeep, lessStrict, start) {
    if (maxDeep !== undefined && !maxDeep) {
      return;
    } else if (maxDeep !== undefined) {
      maxDeep--;
    }
    
    if (!(obj instanceof Object)) {
      return obj;
    }
    
    if (lessStrict) {
      if (obj instanceof Node ||
          obj === window) {
          //dont copy those objects, they are read only
        return obj;
      }
    }

    var copy = (obj instanceof Array) ? [] : {};
    if (start === undefined) {
      travelArray = [];
      start = 0;
    }
    
    var object, exists, i;
    
    if (copy instanceof Array) {
      for (i = 0; i < obj.length; i++) {
        object = obj[i];
        travelArray[start] = [object, copy, i];
        exists = existsInPath(object, start);
        if (!exists) {
          copy.push(Utils.objectCopy(object, maxDeep, lessStrict, start + 1));
        } else {
          //pass existing copy!
          copy.push(exists[1][exists[2]]);
        }
      }
    } else {
      i = 0;
      for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          object = obj[prop];
          travelArray[start] = [object, copy, i];
          exists = existsInPath(object, start);
          if (!exists) {
            copy[prop] = Utils.objectCopy(object, maxDeep, lessStrict, start + 1);
          } else {
            //pass existing copy!
            copy[prop] = exists[1][exists[2]];
          }
        }
        i++;
      }
    }
    return copy;
  };
  
  var traverseArray = [];
  function existsInTraversePath(object, max) {
    for (var i = 0; i < max && i < traverseArray.length; i++) {
      if (object === traverseArray[i]) {
        return true;
      }
    }
    return false;
  }
  
  var global = null;
  try {
    global = (false || eval)("this") || (function () { return this; }());
  } catch (e) {}
  
  /**
   * 
   * @param {type} obj
   * @param {type} exe
   * @param {type} cfg
   * @param {type} start
   * @param {type} parent
   * @param {type} prop
   * @param {type} trackPath
   * @returns {undefined}
   */
  Utils.traverse = function (obj, exe, cfg, start, parent, prop, trackPath) {
    cfg = cfg || {};
    
    if (cfg.hasOwn === undefined) {
      cfg.hasOwn = true;
    }
    
    if (cfg.objectsOnly && !(obj instanceof Object)) {
      return;
    }
    
    if (cfg.maxDeep !== undefined && !cfg.maxDeep) {
      return;
    } else if (cfg.maxDeep !== undefined) {
      cfg.maxDeep--;
    }
    
    parent = parent || obj;
    
    if (!cfg || !cfg.nodes) {
      try {
        if (obj instanceof Node) {
          //dont follow those objects
          return;
        }
      } catch (ie) {
        if (obj instanceof ActiveXObject && obj.nodeType !== undefined) {
          return; //IE case, no comment
        }
      }
    }
    if (obj === window || obj === global) {
      //dont follow those objects
      return;
    }

    if (start === undefined) {
      traverseArray = [];
      start = 0;
    }
    
    if (existsInTraversePath(obj, start)) {
      return;
    }

    traverseArray[start] = obj;

    var stopHere = exe(obj, parent, prop, trackPath);
    
    if (stopHere) {
      return;
    }
    
    var i = 0;
    var objPath = "";
    for (var pprop in obj) {
      if (!cfg.hasOwn || (obj.hasOwnProperty(pprop))) {
        try {
          var object = obj[pprop];
          if (cfg.track) {
            objPath = trackPath ? (trackPath + "." + pprop) : pprop;
          }
          Utils.traverse(object, exe, cfg, start + 1, parent, pprop, objPath);
        } catch (e) {}
      }
      i++;
    }
  };

  /**
   * Prepares string to be quoted and evaluable.
   * @param {String} string
   * @returns {String} quoted string or the input parameter if parameter is not
   *  a string.
   */
  Utils.prepareQuotedString = function (string) {
    if (typeof(string) === "string") {
      return "\"" + (string.replace(/\"/g, "\\\"")) + "\"";
    } else {
      return string;
    }
  };

  /**
   * Function builds desired name space.
   * It will not override existing elements.
   * @param {String} path
   * @param {Object} instance
   * @param {Object} pckg
   * @param {Boolean} noOverride
   * @returns {Object}
   */
  Utils.namespace = function (path, instance, pckg, noOverride) {
    var files = path.split("."),
      //access eval INDIRECT so it is called globally
      current = Utils.NAMESPACE_BASE || (function () {return eval("this"); }()),
      last = null,
      lastName = null,
      i;
    
    current = pckg || current;
    
    for (i = 0; i < files.length - 1; i += 1) {
      last = current;
      lastName = files[i];
      current[lastName] = current[lastName] || {};
      current = current[lastName];
    }
    
    last = current;
    lastName = files[files.length - 1];
    
    if (instance !== undefined) {
      if (last[lastName] === undefined || !noOverride) {
        last[lastName] = instance;
      }
    } else {
      last[lastName] = last[lastName] || {};
    }
    
    return last[lastName];
  };

  /**
   * 
   * @param {type} path
   * @param {type} base
   * @returns {window|Window}
   */
  Utils.getObjectUsingPath = function (path, base) {
    base = base || window;
    var parts = path.split(".");
    for (var i = 0; i < parts.length; i++) {
      if (base) {
        base = base[parts[i]];
      }
    }
    return base;
  };

  /**
   * Utility for simple class declaration (not definition).
   * It does similiar job as namespace with addition of adding CLASS_NAME
   * and PACKAGE_NAME on prototype. It also sets superclass to extending class
   * instance.
   * 
   * @param {String} path
   * @param {Object} instance
   * @param {Function} extendingClass
   * @param {Object} pckg
   * @param {Object} config
   * @returns {Object} the class instance
   */
  Utils.clazz = function (path, instance, extendingClass, pckg, config) {
    Utils.namespace(path, instance, pckg, true);
    if (typeof(extendingClass) === "function") {
      instance.superclass = extendingClass;
      instance.prototype = new instance.superclass(config);
    }
    if (instance.prototype) {
      var names = path.split(".");
      instance.prototype.CLASS_NAME = names[names.length - 1];
      names.splice(names.length - 1, 1);
      instance.prototype.PACKAGE_NAME = names.join(".");
    }
    return instance;
  };

/**
 * 
 * @param {String} expr expression used for function
 * @param {String} argzString optional arguments part, example: "arg1, arg2"
 * @returns {Function} function made from expression block
 */
  Utils.expressionToFunction = function (expr, argzString) {
    argzString = argzString || "";
    var funTemplate = "function (" + argzString + ") {" + expr + "}";
    return Utils.gevalAndReturn(funTemplate);
  };
  
  /**
   * Utility for class creation.
   * 
   * @param {Object} config
   * @param {String} classPath
   * @param {Function} extendingClass
   * @returns {Object} defined class
   */
  Utils.defineClass = function (classPath, extendingClass, config) {
    
    var names = classPath.split(".");
    var className = names[names.length - 1];
    
    //create class
    //@TODO create eval fix and do proper wrap.
    var clazz;
    var funTemplate = "(function " + className + "() {" +
      "  if (" + classPath + "._CONSTRUCTOR) {" +
      "    " + classPath + "._CONSTRUCTOR.apply(this, arguments);" +
      "  } else {" +
      "    if (" + classPath + ".superclass) {" +
      "      " + classPath + ".superclass.apply(this, arguments)" +
      "    }" + 
      "  }" +
      "})";
    
    clazz = Utils.gevalAndReturn(funTemplate);

//or anonymous:
//    var clazz = function () {
//      if (CONSTR) {
//         CONSTR.apply(this, arguments);
//      } else if (clazz.superclass) {
//        clazz.superclass.apply(this, arguments);
//      }
//    };

    var CONSTRUCTOR = config.CONSTRUCTOR;
    
    clazz._CONSTRUCTOR = CONSTRUCTOR;
    clazz.superclass = extendingClass;
    
    //publish class
    this.clazz(classPath, clazz, extendingClass);
    
    //pass prototype objects
    for (var prop in config) {
      if (config.hasOwnProperty(prop) && prop !== "CONSTRUCTOR") {
        clazz.prototype[prop] = config[prop];
      }
    }
    return clazz;
  };
  
  /**
   * Important compat utility for keys listing on objects.
   * @param {Object} obj
   * @returns {Array}
   */
  Utils.keys = function (obj) {
    if (obj instanceof Object) {
      if (Object.keys) {
        return Object.keys(obj);
      }
      var keys = [];
      for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          keys.push(prop);
        }
      }
      return keys;
    } else {
      throw "keys() called on non-object!";
    }
  };


  /**
   * Cross-browser source element resolving function from DOM event object.
   * 
   * @param {Object} evt
   * @returns {Node}
   */
  Utils.getSrcElement = function (evt) {
    var elem;
    evt = evt || window.event;
    if (evt.srcElement) {
      elem = evt.srcElement;
    } else if (evt.target) {
      elem = evt.target;
    }
    return elem;
  };

  /*
   * Local function taking as argument and array and a string that will be 
   * added to the array if it does not equal (===) to any of items.
   * 
   * @param {Array} array
   * @param {Object} obj
   * @returns {Number} objects position in array,
   *  if doesnt exist it will return -1. It means that object was appended at 
   *  the end of array.
   * if exists it will return its popsition.
   */
  Utils.addToArrayIfNotExist = function (array, obj) {
    var i = 0, exists = false;
    for (; i < array.length; i += 1) {
      if (array[i] === obj) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      array.push(obj);
      i = -1;
    }
    return i;
  };
  
  /*
   * Local function taking as argument and array and a string that will be 
   * added to the array if it does not equal (===) to any of items.
   * 
   * @param {Array} array
   * @param {Object} obj
   * @returns {Number} objects position in array,
   *  if doesnt exist it will return -1. It means that object was appended at 
   *  the end of array.
   * if exists it will return its popsition.
   */
  Utils.indexInArray = function (array, obj) {
    var i = 0, exists = false;
    for (; i < array.length; i++) {
      if (array[i] === obj) {
        exists = true;
        break;
      }
    }
    return exists ? i : -1;
  };
  
  /*
   * Local function taking as argument and array and a string that will be  
   * removed from the array if it equals (===) to any of array items.
   * 
   * @param {Array} array
   * @param {Object} obj
   */
  Utils.removeFromArray = function (array, obj) {
    var i = 0;
    for (; i < array.length; i += 1) {
      if (array[i] === obj) {
        array.splice(i, 1);
      }
    }
  };
  
  /**
   * Cross browser add className wrapper.
   * Nowadays, browsers support "classList" property - still not all of them.
   * 
   * @param {Node} node
   * @param {String} name
   */
  Utils.addClass = function (node, name) {
    var classes;
    try {
      node.classList.add(name);
    } catch (ex) {
      if (node.className === null) {
        node.className = name;
        return;
      }
      classes = node.className.split(" ");
      Utils.addToArrayIfNotExist(classes, name);
      node.className = classes.join(" ");
    }
  };
  
  /**
   * Cross browser remove className wrapper.
   * Nowadays, browsers support "classList" property - still not all of them.
   * 
   * @param {Node} node
   * @param {String} name
   */
  Utils.removeClass = function (node, name) {
    var classes;
    try {
      node.classList.remove(name);
    } catch (ex) {
      if (node.className === null) {
        node.className = "";
        return;
      }
      classes = node.className.split(" ");
      Utils.removeFromArray(classes, name);
      node.className = classes.join(" ");
    }
  };
  
  /**
   * @TODO refactor this. Now comaptible with old code.
   * @param {type} expression
   * @returns {undefined}
   */
  Utils.gevalAndReturn = function (expression) {
    Utils.gevalAndReturn.___var_test___ = undefined;
    expression  =
      ("qubit.opentag.Utils.gevalAndReturn.___var_test___ = (" +
        expression + ")");
    Utils.geval(expression);
    return Utils.gevalAndReturn.___var_test___;
  };
  
  /**
   * Trim function for string.
   * @param {type} string
   * @returns {unresolved}
   */
  Utils.trim = function (string) {
    try {
      return String(string).trim();
    } catch (noTrim) {
      return String(string).replace(/^\s+|\s+$/g, '');
    }
  };
  
  /**
   * Utility useful to apply default values on config objects, it sets
   * values from src on obj if unset on obj.
   * @param {type} obj
   * @param {type} src
   * @returns {undefined}
   */
  Utils.setIfUnset = function (obj, src) {
    if (obj && src) {
      for (var prop in src) {
        if (src.hasOwnProperty(prop) && !obj.hasOwnProperty(prop)) {
          obj[prop] = src[prop];
        }
      }
    }
  };
  
  /**
   * @TODO refactor this. Now comaptible with old code.
   * @param {type} expression
   * @returns {undefined}
   */
  Utils.geval = function (expression) {
    if (window.execScript) {
      window.execScript(expression);
    } else {
      (function () {return window["eval"].call(window, expression); }());
    }
  };
  
  /**
   * Get top node parentNode object.
   * @param {type} node
   * @returns {node.parentNode}
   */
  Utils.topNode = function (node) {
    while (node && node.parentNode) {
      node = node.parentNode;
    }
    return node;
  };
  
  /**
   * 
   * @param {type} node
   * @returns {Boolean}
   */
  Utils.isInDOM = function (node) {
    if (Utils.topNode(node) === document) {
      return true;
    }
    return false;
  };
  
  Utils.nextElement = function (node) {
    while (node && !node.tagName) {
      node = node.nextSibling;
    }
    return node;
  };
  
  Utils.namespace("qubit.widget.utils.Utils", Utils);
}());

//= require <qubit/widget/utils/Utils>

/*
 * OpenTag, a tag deployment platform
 * Copyright 2011-2013, QuBit Group
 * http://opentag.qubitproducts.com
 */


(function () {
  
  var log = new qubit.widget.base.Log("Mouse: "),
    Utils = qubit.widget.utils.Utils,
    handler,
    winHandler,
    muHandler;
  
  function Mouse() {
    
  }
  
  /**
   * Browser scroll left getter
   * @returns {} left total scroll
   */
  Mouse.scrollLeft = function () {
    return (document.documentElement && document.documentElement.scrollLeft) ||
      document.body ? document.body.scrollLeft : 0;
  };
  
  /**
   * Browser scroll top getter
   * @returns {} top total scroll
   */
  Mouse.scrollTop = function () {
    return (document.documentElement && document.documentElement.scrollTop) ||
      document.body ? document.body.scrollTop : 0;
  };

  /**
   * Getter for current page cursor offset X
   * @param {Event} e
   * @returns {Number}
   */
  Mouse.pageX = function (e) {
    e = e || window.event;
    return e.clientX + this.scrollLeft();
  };

  /**
   * Getter for current page cursor offset Y
   * @param {Event} e
   * @returns {Number}
   */
  Mouse.pageY = function (e) {
    e = e || window.event;
    return e.clientY + this.scrollTop();
  };
  
  Mouse.X = -1;
  Mouse.Y = -1;
  
  Mouse.screenX = -1;
  Mouse.screenY = -1;
  
  /**
   * mouse up event handler, its static function triggering any 
   * registered handlers.
   * @param {Event} e
   * @returns {undefined}
   */
  Mouse.mouseUpHandler = function (e) {
    var i;
    e = e || window.event;
    for (i = 0; i < Mouse.mouseUpHandlers.length; i += 1) {
      try {
        Mouse.mouseUpHandlers[i](e);
      } catch (ex) {
        log.FINE("Mouse released handling exception: " + e);
      }
    }
    log.FINEST("Mouse released.");
  };
  
  /**
   * mouse move event handler, its static function triggering any 
   * registered handlers. It also updates current Mouse.X and Mouse.Y values.
   * @param {Event} e
   * @returns {Boolean}
   */
  Mouse.mouseMoveHandler = function (e) {
    var i, x, y;
    e = e || window.event;
    
    x = Mouse.pageX(e);
    y = Mouse.pageY(e);
    
    if (Mouse.X === x && Mouse.Y === y) {
      return false;
    }
    
    Mouse.X = x;
    Mouse.Y = y;
    
    Mouse.screenX = e.clientX;
    Mouse.screenY = e.clientY;
    
    for (i = 0; i < Mouse.mouseMovedHandlers.length; i += 1) {
      try {
        Mouse.mouseMovedHandlers[i](e);
      } catch (ex) {
        log.FINE(ex);
      }
    }
    
    return true;
  };
     
  /**
   * 
   * @returns {undefined}
   */
  Mouse.init = function () {
    if (!this.started) {
      handler = document.onmousemove;
      winHandler = window.onmousemove;
      document.onmousemove = window.onmousemove = function (e) {
        Mouse.mouseMoveHandler(e);
        if (handler) {
          handler(e);
        }
        if (winHandler) {
          winHandler(e);
        }
      };

      muHandler = document.onmouseup;
      document.onmouseup = function (e) {
        Mouse.mouseUpHandler(e);
        if (muHandler) {
          muHandler(e);
        }
      };
    }
  };
  
  /**
   * Mouse screen covering node, reused often. Safe to be out of DOM
   */
  Mouse.cover = document.createElement("div");
  Utils.addClass(Mouse.cover, "mouse-screen-cover");
  
  /**
   * Store for mouse up/released handlers.
   * Add any function to be triggered.
   */
  Mouse.mouseUpHandlers = [];
  
  /**
   * Store for mouse move handlers.
   * Add any function to be triggered.
   */
  Mouse.mouseMovedHandlers = [];
  
  /**
   * Function covering screen with a shim.
   * @returns {undefined}
   */
  Mouse.coverScreen = function () {
    document.body.appendChild(Mouse.cover);
  };
  
  /**
   * Function uncovering screen with a shim.
   * @returns {undefined}
   */
  Mouse.uncoverScreen = function () {
    try {
      document.body.removeChild(Mouse.cover);
    } catch (ex) {
      //just try, it may not be in DOM
    }
  };
  
  /**
   * Bubbling cancelling function.
   * @param {Event} e
   * @returns {undefined}
   */
  Mouse.cancelBubble = function (e) {
    e = e || window.event;
    if (e.stopPropagation) {
      e.stopPropagation();
    } else {
      e.cancelBubble = true;
    }
  };
  
  /**
   * Default preventing function.
   * @param {Event} e
   * @returns {Boolean}
   */
  Mouse.preventDefault = function (e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.returnValue = false;
    return false;
  };
  
  /**
   * Source elkement getter for event.
   * @param {Event} e
   * @returns {Node}
   */
  Mouse.getSource = function (e) {
    return e.target || window.event.srcElement;
  };
  
  Utils.namespace("qubit.widget.utils.Mouse", Mouse);
}());

qubit.widget.utils.Mouse.init();
//= require <qubit/widget/utils/Utils>
//= require <qubit/widget/utils/Mouse>

/*
 *
 * OpenTag, a tag deployment platform
 * Copyright 2011-2013, QuBit Group
 * http://opentag.qubitproducts.com
 */

(function () {
  
  var log = new qubit.widget.base.Log("Positioning: "),
    Utils = qubit.widget.utils.Utils,
    Mouse = qubit.widget.utils.Mouse,
    IS_IE = false;
  
  if (navigator.appName === "Microsoft Internet Explorer") {
    IS_IE = true;
  }
    
  /**
   * Simple position manager for node elements.
   * It can easily make a node draggable/moveable.
   * 
   * @param {type} node
   * @returns {Positioning}
   */
  function Positioning(node) {
    this.node = node;
    this.disconnectMouseHandler = this.disconnectMouse.bind(this);
    this.mouseMoveHandler = this.mouseMove.bind(this);
    
    Positioning.moveables.push(this);
    log.FINEST("Positioning created.");
  }
  
  /**
   * Store for moveables.
   */
  Positioning.moveables = [];

  /**
   * Function able ta make any object moveable.
   * Two types are available, by default "margin" type is used, specify 
   * "position" to use top and left coordinates in absolute position mode
   * (assuming absolute is set already). Note that margins are often
   * more flexible option.
   * 
   * Which ever type is used, 
   * @param {Node} optional, if used, this node will be used to trigger mouse
   * connection.
   * @param {tString} Type "position" to use positioning instead margins.
   * @returns {undefined}
   */
  Positioning.prototype.makeMoveable = function (byNode, type) {
    this.type = type;
    this.attachedNode = byNode || this.node;
    this.attachedNode.onmousedown = this.connectMouse.bind(this);
    
    this.currentPosition = this.currentPosition || [0, 0];
    
    if (this.type === "position") {
      this.node.style.left = this.currentPosition[0] + "px";
      this.node.style.top = this.currentPosition[1] + "px";
    } else {
      this.node.style.marginLeft = this.currentPosition[0] + "px";
      this.node.style.marginTop = this.currentPosition[1] + "px";
    }
    this.currentPosition = [0, 0];
    log.FINEST("Positioning made moveable " + this.node);
  };
  
  /**
   * Function connecting to the Mouse object in order to start listening to 
   * mouse coordinates.
   * 
   * @param {Event} e
   * @returns {boolean} prevent defaults
   */
  Positioning.prototype.connectMouse = function (e) {
    log.FINE("In connect...");
    e = e || window.event;
    
    if (this.attachedNode !== Mouse.getSource(e)) {
      return true;
    }
    
    if (!this.moving) {
      this.mouseCoverHandler = Mouse.cover.onmousemove;
      this.startXY = this.currentPosition;
      this.mouseXY = [Mouse.pageX(e), Mouse.pageY(e)];
      Mouse.coverScreen();
      Utils.addToArrayIfNotExist(Mouse.mouseUpHandlers,
        this.disconnectMouseHandler);
      Utils.addToArrayIfNotExist(Mouse.mouseMovedHandlers,
        this.mouseMoveHandler);
      this.moving = true;
      this.node.style.zIndex = 102;
      log.FINE("Mouse connected.");
    }
    
    return Mouse.preventDefault(e);
  };
  
  /**
   * Mouse moving worker.
   * @param {type} e
   * @returns {undefined}
   */
  Positioning.prototype.mouseMove = function (e) {
    var mmLeft, mmTop;
    if (this.moving) {
      e = e || window.event;
//      //try using move explicitly
//      Mouse.cancelBubble(e);
//      Mouse.mouseMove(e);
      log.FINEST("Mouse moving.");
      mmLeft = this.startXY[0] + Mouse.X - this.mouseXY[0];
      mmTop = this.startXY[1] + Mouse.Y - this.mouseXY[1];
      if (this.type === "position") {
        this.node.style.left = mmLeft + "px";
        this.node.style.top = mmTop + "px";
      } else {
        this.node.style.marginLeft = mmLeft + "px";
        this.node.style.marginTop = mmTop + "px";
      }
      this.currentPosition = [mmLeft, mmTop];
      return Mouse.preventDefault(e);
    }
    return false;
  };
  
  /**
   * Mouse moving disconnectting function. It will cut observing mouse process
   * out.
   * @param {type} e
   * @returns {undefined}
   */
  Positioning.prototype.disconnectMouse = function () {
    log.FINE("Mouse disconnected.");
    this.moving = false;
    this.node.style.zIndex = "";
    Mouse.cover.onmousemove = this.mouseCoverHandler;
    this.mouseCoverHandler = null;
    Mouse.uncoverScreen();
    Utils.removeFromArray(Mouse.mouseMovedHandlers,
        this.mouseMoveHandler);
    Utils.removeFromArray(Mouse.mouseUpHandlers,
        this.disconnectMouseHandler);
        
    log.FINE("Release handlers queue size: " +
      Mouse.mouseUpHandlers.length);/*.FINE(*/
  };
  
  /**
   * Element centering on screen function.
   * 
   * @param {Node} node to be centered
   * @param {String} if true, positioning will be use instead of margins
   * @returns {undefined}
   */
  Positioning.centerElement = function (node, type) {
    var width = node.offsetWidth,
      height = node.offsetHeight,
      browserWidth = Positioning.getBrowserWidth(),
      browserHeight = Positioning.getBrowserHeight(),
      left = Math.floor((browserWidth - width) / 2),
      top = Math.floor((browserHeight - height) / 2);
    
    if (browserHeight < height) {
      top = 8;
    }
    
    if (browserWidth < width) {
      left = 8;
    }
    
    if (type) {
      node.style.marginLeft = left + "px";
      node.style.marginTop = top + "px";
    } else {
      node.style.left = left + "px";
      node.style.top = top + "px";
    }
  };
  
  /**
   * Returns browser width
   * @returns {Number}
   */
  Positioning.getBrowserWidth = function () {
    if (IS_IE) {
      return document.documentElement.clientWidth ||
        document.body.clientWidth;
    } else {
      if (window.innerWidth !== undefined) {
        return window.innerWidth;
      } else {
        return document.documentElement.clientWidth;
      }
    }
  };
  
  /**
   * Returns browser height
   * @returns {Number}
   */
  Positioning.getBrowserHeight = function () {
    if (IS_IE) {
      return document.documentElement.offsetHeight;
    } else {
      if (window.innerHeight !== undefined) {
        return window.innerHeight;
      } else {
        return document.documentElement.clientHeight;
      }
    }
  };
  
  Utils.namespace("qubit.widget.utils.Positioning", Positioning);
}());
//= require <qubit/widget/base/Function>
//= require <qubit/widget/base/Log>

/*
 * OpenTag, a tag deployment platform
 * Copyright 2011-2013, QuBit Group
 * http://opentag.qubitproducts.com
 */

(function () {
  
  /**
   * Simple XHR object for making GET and POST calls.
   * 
   * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
   */
  function Xhr(config) {
  }
  
  var IS_IE = false, log;
  if (navigator.appName === "Microsoft Internet Explorer") {
    IS_IE = true;
  }
  
  log = new qubit.widget.base.Log("Xhr: ");

  /**
   * 
   * @param {type} url
   * @returns {fakeParam.url}
   */
  function fakeParam(url) {
    if (url && url.indexOf('?') !== -1) {
      url += '&fparam=' + (new Date().getTime()) * Math.random();
    } else {
      url += '?fparam=' + (new Date().getTime()) * Math.random();
    }
    return url;
  }
  
  function freeRequest(req) {
    req.onreadystatechange = window.alert;
  }
  
  function encodeMessage(msg) {
    return window.encodeURIComponent(msg);
  }
  
  function prepareMessage(msg, name) {
    name = name || "message=";
    return "&" + name + encodeMessage(msg) + "&encoded=true";
  }
  
  /**
   * 
   * @returns {XMLHttpRequest}
   */
  function getXMLHttpRequest() {
    var request;
    try {
      request = new ActiveXObject("Microsoft.XMLHTTP");
    } catch (e1) {
      try {
        request = new ActiveXObject("Msxml2.XMLHTTP");
      } catch (e2) {
        try {
          request = new XMLHttpRequest();
        } catch (e3) {
          throw ("Your browser does not support AJAX!");
        }
      }
    }
    if (!IS_IE) {
      request.onerror = function onerror() {
        log.ERROR("Loading Error occured, check your connection.");
      };
    } else {
      window.onerror = function onerror() {
        log.ERROR("Loading Error occured, check your connection.");
      };
    }
    return request;
  }
    
  /**
   * 
   * @param {type} url
   * @param {type} callback
   * @param {type} onerror
   * @param {type} notifyLoadStarted
   * @param {type} notifyLoadEnded
   * @returns {Boolean}   */
  Xhr.get = function post(
    url,
    callback,
    notifyLoadStarted,
    notifyLoadEnded
  ) {
    log.FINE("get:");
    log.FINE(arguments, true);
    var xurl, req;
    xurl = fakeParam(url);
    req = getXMLHttpRequest();
    log.FINE("Making request to:" + xurl);
    req.open("GET", xurl, true);
    if (req) {
      try {
        notifyLoadStarted(req);
        log.FINE("get: Notified progress.");
      } catch (e1) {}
      req.onreadystatechange = function (e) {
        if (req.readyState === 4) {
          log.FINE("get: response recieved from " + url + ", request: ");
          log.FINE("req", true);
          try {
            log.FINE("get: Notified progress ending.");
            notifyLoadEnded(req);
          } catch (e2) {}
          var outMsg = req.responseText;
          if (callback) {
            log.FINE("get: running callback...");
            callback(outMsg, req);
          }
          freeRequest(req);
        }
      };
      req.send(null);
    } else {
      throw "Cannot initialise request!";
    }
    return true;
  };
    
  /**
   * 
   * @param {type} url
   * @param {type} message
   * @param {type} callback
   * @param {type} onerror
   * @param {type} notifyLoadStarted
   * @param {type} notifyLoadEnded
   * @returns {Boolean}   */
  Xhr.post = function post(
    url,
    message,
    callback,
    notifyLoadStarted,
    notifyLoadEnded
  ) {
    
    var xurl, req;
    xurl = fakeParam(url);
    req = getXMLHttpRequest();
    log.FINE("Making request to:" + xurl);
    req.open("POST", xurl, true);
    if (req) {
      try {
        log.FINE("get: Notified progress.");
        notifyLoadStarted(req);
      } catch (e1) {}
      req.onreadystatechange = function () {
        if (req.readyState === 4) {
          log.FINE("get: response recieved from " + url + ", request: ");
          log.FINE("req", true);
          try {
            log.FINE("get: Notified progress ending.");
            notifyLoadEnded(req);
          } catch (e2) {}
          var outMsg = req.responseText;
          if (callback) {
            log.FINE("get: running callback...");
            callback(outMsg, req);
          }
          freeRequest(req);
        }
      };
      req.setRequestHeader(
        "Content-type",
        "application/x-www-form-urlencoded; charset=UTF-8"
      );
      req.send(message);
    } else {
      throw "Cannot initialise request!";
    }
    return true;
  };
  
  Xhr.prepareMessage = prepareMessage;
  Xhr.encodeMessage = encodeMessage;

  qubit.widget = qubit.widget || {};
  qubit.widget.base = qubit.widget.base || {};//@TODO PF: remove after merge
  qubit.widget.utils = qubit.widget.utils || {};
  qubit.widget.utils.Xhr = Xhr;
}());
/*
 * OpenTag, a tag deployment platform
 * Copyright 2011-2013, QuBit Group
 * http://opentag.qubitproducts.com
 */


(function () {
  function Node() {
  }
  
  /**
   * Utility function that prepares a string to be fully usable as a attribute 
   * string. It encodes quotes which normally are discarded.
   * 
   * @param {type} string, NOT NULL
   * @returns encoded string for attribute.
   */
  Node.attrString = function (string) {
    //' and "
    return string.replace(/'/g, "&#39;").replace(/\"/g, "&#34;");
  };
  
}());
//= require <qubit/widget/base/ExpandableListItem>
//= require <qubit/widget/SaveHistoryItemBody>

/**
 * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
 */
(function () {
  var Utils = qubit.widget.utils.Utils,
    SaveHistoryItemBody = qubit.widget.SaveHistoryItemBody,
    log = new qubit.widget.base.Log("SaveHistoryItem: ");
  
  /**
   * Widget for history item rendering. Used typically with SaveHistory widget.
   * 
   * @param config
   * @constructor
   */
  function SaveHistoryItem(config) {
    if (!config.extend) {
      SaveHistoryItem.superclass.call(this, config);
      this.progressNode = this.containerHead.children[0];
      this.versionNode = this.containerHead.children[1];
      this.activeTagsNode = this.containerHead.children[2];
      this.inactiveTagsNode = this.containerHead.children[3];
      this.creationDateNode = this.containerHead.children[4];
      this.lastSavedDateNode = this.containerHead.children[5];
      this.authorNode = this.containerHead.children[6];
      if (config.entries) {
        this.setEntries(config.entries);
      }
      this.serverTime = config.serverTime || new Date().valueOf();
      this.setBodyDisabled(false);
      log.FINE("initialising with config:");
      log.FINE(config, true);
    }
  }

  SaveHistoryItem.superclass = qubit.widget.base.ExpandableListItem;
  SaveHistoryItem.prototype = new SaveHistoryItem.superclass();
  SaveHistoryItem.prototype.CLASS_NAME = "SaveHistoryItem";
  SaveHistoryItem.prototype.className += " qubit-widget-save-history-item";

  /**
   * Accepts object with text properties to assigned to the history row.
   * 
   * @param entries {Object} Properties example to be passed (all):
   *  {
   *    version: "96",
   *    activeTags: "6 active tags",
   *    inactiveTags: "7 inactive tags",
   *    creationDate: "Aug 20, 2015",
   *    lastSavedDate: "Jul 24, 2018"
   *  }
   */
  SaveHistoryItem.prototype.setEntries = function (entries) {
    log.FINE(this.CLASS_NAME + "-> setEntries(entries):");
    log.FINE(entries, true);
    
    try {
      var version = isNaN(entries.version) ? "-" : entries.version;
      
      if (entries.timestamp) {
        this.serverTime = +entries.timestamp;
      }
      
      this.profileId = entries.profileId;
      this.versionNode.innerHTML = (+version !== 0) ?
        Utils.secureText(version) : "Not Committed.";

      this.activeTagsNode.innerHTML = Utils.secureText( 
        (entries.activeTags + " active tags") || "no active tags"
      );
      this.inactiveTagsNode.innerHTML = Utils.secureText(
        (entries.inactiveTags + " inactive tags") || "no inactive tags"
      );
      
      if (!entries.lastSavedDate ||
          entries.creationDate <= entries.lastSavedDate) {
        this.creationDateNode.innerHTML = Utils.secureText(
          Utils
            .fancyFormatDate(entries.creationDate, true, this.serverTime) || "-"
        );
      } else {
        this.creationDateNode.innerHTML = "-";
      }
      
      this.lastSavedDateNode.innerHTML = Utils.secureText( 
        entries.lastSavedDate ?
          Utils
            .fancyFormatDate(entries.lastSavedDate, true, this.serverTime) : "-"
      );
      this.authorNode.innerHTML = Utils.secureText(entries.author || "-");
    } catch (ex) {
      log.ERROR("Error during loading history items:\n" + ex);
    }
  };

  SaveHistoryItem.prototype.headClickHandler = function () {
    if (!this.loaded) {
      //show progress.
      log.FINE("Initial body loading for " + this.CLASS_NAME);
      this.loadBody(function () {
        this.loaded = true;
        this.progressNode.style.display = "";
        SaveHistoryItem.superclass.prototype
          .headClickHandler.apply(this, arguments);
      }.bind(this));
    } else {
      return SaveHistoryItem.superclass.prototype
        .headClickHandler.apply(this, arguments);
    }
  };

  SaveHistoryItem.prototype.loadBody = function (callback) {
    if (this.triedBodyLoading) {
      log.FINE("Already triggered body loading.");
      return;
    }
    
    this.triedBodyLoading = true;
    this.progressNode.style.display = "block";
    
    this.body = new SaveHistoryItemBody({
      profileId: this.profileId,
      onLoad: callback,
      serverTime: this.serverTime
    });
    
    this.contentWrapper.innerHTML = "";
    this.add(this.body);
    this.paint();
  };

  /**
   * SaveHistoryItem DOM view template.
   * 
   * @type {string}
   */
  SaveHistoryItem.prototype.viewTemplate = [
    '<div class="item-head">',
    
    '<div class="column progress">',
    '</div>',
    '<div class="column version"> - ',
    '</div>',
    '<div class="column active-tags"> - ',
    '</div>',
    '<div class="column inactive-tags"> - ',
    '</div>',
    '<div class="column creation-date"> - ',
    '</div>',
    '<div class="column last-saved-date"> - ',
    '</div>',
    '<div class="column author"> - ',
    '</div>',
    
    '</div>',
    '<div class="item-body default-inside-shadows">',
    
    '<div class="item-content-wrapper">',
    '  <div class="empty-item">Details not available.</div>',
    '</div>',
    
    '</div>'
  ].join('');

  qubit.widget.SaveHistoryItem = SaveHistoryItem;

}());
//= require <qubit/widget/utils/Utils>
//= require <qubit/widget/base/SIGNALS>
//= require <qubit/widget/base/Actions>

//@TODO PF: move class utils from Utils to Node at utils! after merge.

(function () {
  var log = new qubit.widget.base.Log("BaseWidget: ");
  /**
   * @package qubit.widget.base
   * @class BaseWidget
   * 
   * Comon widget for any DOM element. Contains repeatable processing
   * characteristic for all basic needs of DOM elements and Widgets structure
   * management. It is important to keep its simplicity as its used as a top
   * class for any widget that:
   * - have DOM container
   * - have HTML string template
   * - may: contain or self contain in any of its instances
   * 
   * When designing your widget, you shoulkd be always aware of its DOM
   * structure. This way the widget will have precised DOM structure and 
   * performance wise design. Always define your template and attach constant
   * nodes on the class body.
   * 
   * @param config Config object: {
   *  parentContainer: {Node} node where this widget will be anchored in the
   *   DOM. If this widget will be added to other widget, this property will be
   *   changed to the parent widgets parent.getChildrenContainer() Node or
   *   optional node parameter used with add(widget,node) function.
   *   See #getChildrenContainer() for more details.
   *  className: {String} any extra class name will be added if passing 
   *   with this config option.
   * }
   * 
   * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
   */
  function BaseWidget(config) {
    if (config) {
      this.init(config);
    }
  }

  BaseWidget.prototype.viewTemplate = "";
  BaseWidget.prototype.tagName = "div";
  BaseWidget.prototype.className = "qubit-widget-base-widget";
  BaseWidget.prototype.CLASS_NAME = "BaseWidget";

  /**
   * Init wrapping function.
   */
  BaseWidget.prototype.init = function (config) {
    var className;
    if (!config) {
      throw "config object must be passed!";
    }
    className = this.className || "";
    if (config.className) {
      className += " " + config.className;
    }
    if (config.viewTemplate) {
      this.viewTemplate = config.viewTemplate;
    }
    this.parentContainer = config.parentContainer;
    this.children = [];
    this.container = document.createElement(this.tagName);
    this.container.className = className;
    this.container.innerHTML = this.viewTemplate || "";
    log.FINE(this.CLASS_NAME + "-> init(config):");
    log.FINE(config, true);
  };

  /**
   * Common paint entry. It does render entire widget with dependencies.
   * It's not error safe and does not validate children.
   */
  BaseWidget.prototype.paint = function () {
    var i = 0, process = !this.painted;
    if (process) {
      if (this.onBeforePaint) {
        this.onBeforePaint();
      }
    }
    for (; i < this.children.length; i += 1) {
      this.children[i].paint();
    }
    if (process) {
      this.parentContainer.appendChild(this.container);
      this.painted = true;
      if (this.onPaint) {
        this.onPaint();
      }
    }
  };

  /**
   * Simple adding widget function. It IS type safe and BaseWidget
   * implementation reference must passed or error will be thrown.
   * 
   * @param widget {BaseWidget}
   * @param node {Node} alternative node to be the parent node for the widget
   */
  BaseWidget.prototype.add = function (widget, node) {
    if (!widget instanceof BaseWidget) {
      throw "Only BaseWidget instance allowed";
    }
    var where = node || this.getChildrenContainer();
    widget.parentContainer = where;
    this.children.push(widget);
    log.FINE(this.CLASS_NAME + "-> add(widget):");
    log.FINE(widget, true);
  };

  /**
   * Removing widget function. Its type safe and BaseWidget
   * implementation reference must passed or error will be thrown.
   * Note: this is not a destroy equivalent.
   * Use it when you want to remove widget from its class without any harm to
   * the child (detach & unregister).
   * 
   * @param widget {BaseWidget}
   */
  BaseWidget.prototype.remove = function (widget) {
    var removed, i = 0;
    if (!widget instanceof BaseWidget) {
      throw "Only BaseWidget instance allowed.";
    }
    for (; i < this.children.length; i += 1) {
      if (this.children[i] === widget) {
        removed = this.children.splice(i, 1)[0];
        removed.detach();
        if (this.painted) {
          try {
            this.getChildrenContainer().removeChild(widget.container);
          } catch (ex) {
            //swallow if inner applied
          }
        }
      }
    }
    log.FINE(this.CLASS_NAME + "-> remove()");
  };

  /**
   * Showing container function. Note: it does not trigger paint.
   */
  BaseWidget.prototype.show = function () {
    this.container.style.display = "";
    log.FINE(this.CLASS_NAME + "-> show()");
  };

  /**
   * Hiding container function.
   */
  BaseWidget.prototype.hide = function () {
    this.container.style.display = "none";
    log.FINE(this.CLASS_NAME + "-> hide()");
  };

  /**
   * Important getter. It must return desired children DOM placeholder.
   * Default is this.container.
   * You may and should reimplement this method if you edit viewTemplate.
   */
  BaseWidget.prototype.getChildrenContainer = function () {
    return this.container;
  };
  
  /**
   * Destroy method. Use when you need to destroy widget and remove view.
   * Typically you can call this method when you wanna remove the widget
   * quick and forever.
   * 
   * @param deep
   */
  BaseWidget.prototype.destroy = function (deep) {
    var i = 0;
    if (!this.isDestroyed) {
      log.FINE(this.CLASS_NAME + "-> destroy(" + deep + ")");
      
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
        this.container.innerHTML = "";
      }

      if (deep) {
        for (; i < this.children.length; i += 1) {
          this.children[i].destroy(deep);
        }
      }

      if (this.onDestroy) {
        try {
          this.onDestroy();
        } catch (ex) {
          //swallow
        }
      }
    }

    this.isDestroyed = true;
  };

  /**
   * Detaching function. Use whenever you need to remove widget from view.
   */
  BaseWidget.prototype.detach = function () {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.painted = false;
    log.FINE(this.CLASS_NAME + "-> detach()");
  };
    
  //recheck package
  qubit.widget = qubit.widget || {};
  qubit.widget.base = qubit.widget.base || {};
  qubit.widget.base.BaseWidget = BaseWidget;

}());

//= require <qubit/widget/base/Log>
/**
 * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
 */
(function () {
  /**
   * Bind function should be already native in most browsers.
   * If not, we must use very basic replacement here.
   * We may inject recommended by:
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference
   * /Global_Objects/Function/bind
   * Template, but for now it will stay simple.
   * It is recommended that you pass specific arguments using closures.
   * 
   * @param {type} ctx
   * @param {type} ref
   * @returns {unresolved}
   */
  Function.prototype.bind = Function.prototype.bind || function (ctx) {
    var _this = this;
    return function () {
      _this.apply(ctx, arguments);
    };
  };
}());
/*EXCLUDE-FROM-OT-BUILD*/
//= require <qubit/widget/base/Log>


/**
 * Currently, this library is not used in Opentag.
 * Added as expected in short future needs will raise.
 * Code prepared from past experience.
 * 
 * Actions is a small library letting map in simple string way any node element
 * to callback function residing in global available map.
 * 
 * It is mostly used for releasing easiness of HTML innerHTML operations
 * without need for rewiring existing events. It is also good solution for
 * possible memory leaks in IE browsers (from cross scopes).
 * Use if innerHTML in your templating is an easier option.
 * 
 * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
 */
(function () {
  
  var counter = 0, CLICK_ACTIONS = {},
    log = new qubit.widget.base.Log("Actions: ");
  
  function Actions() {
  }
  
  /**
   * CLICK ASCTIONS MAP
   */
  Actions.CLICK_ACTIONS = CLICK_ACTIONS;
  
  /**
   * Function assigning to node an action and mapping it using tyhe actionName.
   * 
   * 
   * @param {type} node
   * @param {type} actionName
   * @param {type} action
   * @returns {undefined}
   */
  Actions.clickAction = 
    function (node, actionName, action) {
      if (!actionName) {
        log.FINE("Action name undefined, assigning default value.");
        actionName = "ca-" + (counter += 1);
      } else if (CLICK_ACTIONS[actionName]) {
        log.FINE("Action name already exists, assigning suffix.");
        actionName += "-" + (counter += 1);
      }
      node.setAttribute("click-action", actionName);
      return this.registerClickAction(actionName, action);
    };
  
  /**
   * 
   * @param {type} node
   * @param {type} actionName
   * @returns {undefined}
   */
  Actions.clickAction = function (node, actionName) {
    return Actions.clickAction(node, actionName, this);
  };
   
  /**
   * 
   * @param {type} actionName
   * @param {type} action
   * @returns {undefined}
   */
  Actions.registerClickAction = function (actionName, action, replace) {
    if (!replace && CLICK_ACTIONS[actionName]) {
      log.FINE("Action name already exists, assigning suffix.");
      actionName += "-" + (counter += 1);
    }
    log.FINE("Registered action with name: " + actionName + ", and action:");
    log.FINE(action, true);
    CLICK_ACTIONS[actionName] = action;
    return actionName;
  };
  
  /**
   * 
   * @param {type} actionName
   * @param {type} action
   * @returns {undefined}
   */
  Actions.unregisterClickAction = function (action) {
    var prop;
    log.FINE("Unregistering action:");
    log.FINE(action, true);
    if (typeof (action) === "string") {
      for (prop in CLICK_ACTIONS) {
        if (CLICK_ACTIONS.hasOwnProperty(prop) && prop === action) {
          CLICK_ACTIONS[prop] = undefined;
          delete CLICK_ACTIONS[prop];
          log.FINE("Success.");
          break;
        }
      }
    } else {
      for (prop in CLICK_ACTIONS) {
        if (CLICK_ACTIONS.hasOwnProperty(prop) &&
              CLICK_ACTIONS[prop] === action) {
          CLICK_ACTIONS[prop] = undefined;
          delete CLICK_ACTIONS[prop];
          log.FINE("Success.");
          break;
        }
      }
    }
  };
  
  /*
   * Getting the event source element 
   * @param {type} evt
   * @returns {unresolved}
   */
  function getSrcElement(evt) {
    var elem; 
    evt = evt || window.event;
    if (evt.srcElement) {
      elem = evt.srcElement;
    } else if (evt.target) {
      elem = evt.target;
    }
    return elem;
  }
  
  /* Finds the action node, typically from the event src node
   * 
   * @param {type} node
   * @param {type} actionName
   * @returns {unresolved}
   */
  function findActionNode(node, actionName) {
    while (node && (!node.getAttribute || !node.getAttribute(actionName))) {
      node = node.parentNode;
    }
    return node;
  }
  
  /* Processing the click action.
   * 
   * @param {type} e
   * @param {type} name
   * @returns {unresolved}
   */
  function processClickAction(e, type) {
    var actionName, action, src, actionSource;
    
    if (window.IGNORE_CLICK_ONCE) {
      window.IGNORE_CLICK_ONCE = false;
      return;
    } else if (window.IGNORE_CLICK) {
      return;
    }

    src = getSrcElement(e);
    actionSource = findActionNode(src, type + "-action");
    
    if (actionSource) {
      log.FINE("Found action source: ");
      log.FINE(actionSource, true);
      actionName = actionSource.getAttribute(type + "-action");
      if (actionName) {
        log.FINE("Searching for " + type + " action: " + actionName);
        action = CLICK_ACTIONS[actionName];
        if (action) {
          log.FINE("Found " + type + " action by name:");
          log.FINE(actionName + ", action:");
          log.FINE(action, true);
          action(e, actionSource);
        }
      }
    }
  }
  
  /**
   * The init function for iunitialising some of the handlers.
   * In some cases may be useful to call it later on.
   * @returns {undefined}
   */
  Actions.init = function init(node) {
    var doc, existingHandler;
    
    doc = node || document;
    existingHandler = doc.onclick;
    
    if (existingHandler && processClickAction !== existingHandler) {
      doc.onclick = function globalClickHandler(e) {
        try {
          existingHandler(e); //was before
        } finally {
          processClickAction(e, "click");
        }
      };
    } else {
      doc.onclick = function globalClickHandler(e) {
        processClickAction(e, "click");
      };
    }
  };
  
  /*
   * If there is document - just attach handlers.
   */
  if (window.document) {
    Actions.init();
  }
  
}());
//= require <qubit/widget/base/ListItem>

(function () {
  var Utils = qubit.widget.utils.Utils,
    log = new qubit.widget.base.Log("ExpandableListItem: ");
  
  /**
   * Simple widget for expandable list items rendering.
   * 
   * @param config : {
   *  [widget base defaults]
   * }
   * 
   * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
   */
  function ExpandableListItem(config) {
    if (config) {
      ExpandableListItem.superclass.call(this, config);
      this.setBodyDisabled(!!config.bodyDisabled);
      this.containerHead = this.container.children[0];
      this.containerBody = this.container.children[1];
      this.contentWrapper = this.containerBody.children[0];
      this.containerHead.onclick =
        this.headClickHandler.bind(this);
      log.FINE("ExpandableListItem(config):");
      log.FINE(config, true);
    }
  }
  
  ExpandableListItem.superclass = qubit.widget.base.ListItem;
  ExpandableListItem.prototype = new ExpandableListItem.superclass();
  ExpandableListItem.prototype.CLASS_NAME = "ExpandableListItem";
  ExpandableListItem.prototype.className +=
    " qubit-widget-base-expandable-list-item";

  /*
   * local offset meassuring function. It is important it is used only
   * for local purpose. It may change accordingly to body content complications.
   */
  function getInternalsOffsetHeight(elements) {
    var i = 0, sum = 0;
    for (; i < elements.length; i += 1) {
      sum += elements[i].offsetHeight;
    }
    return sum;
  }
  
  /**
   * Sets the body as disabled or enabled.
   * @param {type} disabled
   * @returns {unresolved}
   */
  ExpandableListItem.prototype.setBodyDisabled = function (disabled) {
    this.bodyDisabled = !!disabled;
    if (this.bodyDisabled) {
      Utils.addClass(this.container, "disabled");
    } else {
      Utils.removeClass(this.container, "disabled");
    }
  };

  /**
   * Use to toggle visibility of lists item body content.
   * @return {boolean} false when triiger didnt proceed
   *  (eq. expanding is disabled)
   */
  ExpandableListItem.prototype.headClickHandler = function () {
    log.FINE(this.CLASS_NAME + "-> headClickHandler()");
    if (this.bodyDisabled) {
      return false;
    }
    this.toggleBodyBodyExpanded();
    return true;
  };
  
  /**
   * Use to toggle visibility of lists item body content.
   * @return {boolean} false when triiger didnt proceed
   *  (eq. expanding is disabled)
   */
  ExpandableListItem.prototype.toggleBodyBodyExpanded = function () {
    
    log.FINE(this.CLASS_NAME + "-> toggleBodyBodyExpanded()");
    
    if (this.expanded) {
      if (this.onBeforeUnExpand) {
        log.FINE(this.CLASS_NAME + "-> onBeforeUnExpand()");
        this.onBeforeUnExpand(this);
      }
      this.containerBody.style.height = "";
      Utils.removeClass(this.containerBody, "visible");
      if (this.onUnExpand) {
        log.FINE(this.CLASS_NAME + "-> onUnExpand()");
        this.onUnExpand(this);
      }
    } else {
      if (this.onBeforeExpand) {
        log.FINE(this.CLASS_NAME + "-> onBeforeExpand()");
        this.onBeforeExpand(this);
      }
      this.contentWrapper.style.height = "auto";
      this.containerBody.style.height = 
        getInternalsOffsetHeight([this.contentWrapper]) + "px";
      this.contentWrapper.style.height = "";
      Utils.addClass(this.container, "visible");
      if (this.onExpand) {
        log.FINE(this.CLASS_NAME + "-> onExpand()");
        this.onExpand(this);
      }
    }
    this.expanded = !this.expanded;
    log.FINE(this.CLASS_NAME + "-> this.expanded: " + this.expanded);
  };
  
  ExpandableListItem.prototype.destroy = function (deep) {
    log.FINE(this.CLASS_NAME + "-> destroy(deep):" + deep);
    ExpandableListItem.superclass.prototype.destroy.apply(this, arguments);
  };
  
  /**
   * Overriding default childrens container as they must be wrapped.\
   * 
   * @returns {Node} 
   */
  ExpandableListItem.prototype.getChildrenContainer = function () {
    return this.contentWrapper;
  };
  
  /**
   * ExpandableListItem DOM view template.
   * 
   * @type {string}
   */
  ExpandableListItem.prototype.viewTemplate = [
    '<div class="item-head">',
    '</div>',
    '<div class="item-body default-inside-shadows">',
    '<div class="item-content-wrapper">',
    '</div>',
    '</div>'
  ].join('');

  qubit.widget.base.ExpandableListItem = ExpandableListItem;

}());
//= require <qubit/widget/base/BaseWidget>

/**
 * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
 */
(function () {
  var log = new qubit.widget.base.Log("List: ");
  /**
   * Widget for simple list rendering.
   * 
   * @param config : {
   *  [widget base defaults]
   * }
   * 
   * @author peter.fronc@qubitproducts.com
   */
  function List(config) {
    if (config) {
      List.superclass.call(this, config);
      this.containerHead = this.container.children[0];
      this.containerBody = this.container.children[1];
      log.FINE("List(config):");
      log.FINE(config, true);
    }
  }

  List.superclass = qubit.widget.base.BaseWidget;
  List.prototype = new List.superclass();
  List.prototype.CLASS_NAME = "List";
  List.prototype.className += " qubit-widget-list";

  /**
   * Adds all widgets and paint them.
   *  
   * @param {[qubit.widget.base.WidgetBase]} Array of widget items
   * @returns {undefined}
   */
  List.prototype.addItems = function (items) {
    log.FINE(this.CLASS_NAME + "-> addItems(items): ");
    log.FINE(items, true);
    var i = 0;
    for (; i < items.length; i += 1) {
      this.add(items[i]);
    }
    this.paint();
  };

  /**
   * List DOM view template.
   * 
   * @type {string}
   */
  List.prototype.viewTemplate = [
    '<div class="item-head">',
    '</div>',
    '<div class="item-body">',
    '</div>'
  ].join('');

  qubit.widget.base.List = List;

}());
/*EXCLUDE-FROM-OT-BUILD*/
//= require <qubit/widget/base/Log>

(function () {
  
  window.SIGNALS_MODE = true;
  
  /**
   * @package basic event/signals manager.
   * Used for simplified and dependency free calls triggering.
   * 
   * This package intruduces simple and effective events/signaling
   * implementation.
   * 
   * 
   * The most important is the SIGNAL function.
   * 
   * 
   * 
   * @type Number
   */
  var interv = 200,
    lastTime = Date.now(),
    jobs = [],
    signals = {},
    callbacks = {},
    SIGNAL_POOLER_TOUT = 20,
    log = new qubit.widget.base.Log("SIGNALS: ");
  
  /**
   * Simple CALL/EVENT function.
   * 
   * I will recall any existing callbacks if registered with given name.
   * @param {type} then, callback name (String) or function to be called,
   * funstion type parameter is an option and mostly used by SIGNAL function.
   * 
   * @param {type} args
   * @returns {undefined}
   */
  function CALL(then, args) {
    log.FINE("CALL(" + then + ")");
    var i;
    if (typeof (then) === "string") {
      signals[then] = true;
      if (callbacks[then]) {
        log.FINE("CALL: found callback:");
        log.FINE(callbacks[then], true);
        for (i = 0; i < callbacks[then].length; i += 1) {
          try {
            callbacks[then][i]();
          } catch (ex) {
            log.ERROR(ex);
          }
        }
      }
    } else {
      try {
        log.FINE("Calling directly passed function...");
        then(args);
      } catch (e) {
        log.ERROR(e, true);
      }
    }
  }
  
  /**
   * Function that react to signaled events in past or future.
   * It's results and callbacks should be treated absolutely asynchronously.
   * The main idea is that depending on existing "when" signal in a system
   * "then" function will be run in a near future or, if "then" is a string,
   * "then" signal is set in a system.
   * There can be many of same "when" signals in a system and each can be used
   * only once. "when" signals are deleted only after matching CALL(or SIGNAL
   * with "when" unset).  
   * 
   * This function has no effect if the pooler is down or SIGNALS_MODE is false.
   * 
   * Very usefull for user tests (very).
   * 
   * @param {type} when
   * @param {type} then
   * @param {type} args
   * @param {type} dontAdd
   * @returns {Boolean}
   */
  function SIGNAL(when, then, args, dontAdd) {
    
    if (!window.SIGNALS_MODE) {
      return false;
    }
    
    if (when === "TIMED OUT") {
      try {
        if (window.TIMED_OUT) {
          log.FINE("SIGNAL: TIMED OUT");
          window.TIMED_OUT();
        }
      } catch (ex) {
        log.FINE(ex, true);
      }
      return false;
    }
    
    if (when) {
      if (signals[when]) {
        log.FINE("SIGNAL: found: " + when);
        CALL(then, args, signals);
        signals[when] = false;
      } else {
        if (!dontAdd) {
          jobs.push({args: [when, then, args], time: Date.now()});
        }
        return false;
      }
    } else {
      log.FINE("SIGNAL: Passing to CALL directly: " + then);
      CALL(then, args);
    }
    return true;
  }

  /**
   * Function attaching callback to a signal name.
   * 
   * @param {type} name String 
   * @param {type} fun
   * @returns {undefined}
   */
  function ON_CALL(name, fun) {
    log.FINE("ON_CALL: creating CALL listener: " + name);
    callbacks[name] = callbacks[name] || [];
    callbacks[name].push(fun);
    return fun;
  }
  
  /**
   * 
   * @param {type} name
   * @returns {unresolved}
   */
  function CLEAR_CALLS(name) {
    log.FINE("CLEAR_CALLS: deleting all calls!");
    var calls = callbacks[name];
    callbacks[name] = undefined;
    delete callbacks[name];
    return calls;
  }
  
  /**
   * 
   * @returns {undefined}
   */
  function CLEAR_ALL_SIGNALS() {
    signals = {};
  }
  
  /**
   * 
   * @returns {undefined}
   */
  function CLEAR_ALL_CALLS() {
    callbacks = {};
  }
  
  /**
   * 
   * @param {type} name
   * @param {type} fun
   * @returns {undefined}
   */
  function REMOVE_CALL(name, fun) {
    log.FINE("REMOVECALL: trying to remove call at" + name);
    var i, calls = callbacks[name];
    if (calls) {
      for (i = 0; i < calls.length; i += 1) {
        if (calls[i] === fun) {
          log.FINE("REMOVECALL: remove at index:" + i);
          calls.splice(i, 1);
        }
      }
    }
  }

  function pooler() {
    var job = jobs[0];
    if (job && ((Date.now() - lastTime) > interv)) {
      if (SIGNAL.call(window, job.args[0], job.args[1], job.args[2], true)) {
        log.FINE("Removing.");
        log.FINE(jobs, true);
        jobs.shift();
      } else if ((Date.now() - job.time) > window.SIGNAL_MAX_TIMEOUT) {
        SIGNAL("TIMED OUT");
      }
      lastTime = Date.now();
    }
    setTimeout(pooler, SIGNAL_POOLER_TOUT);
  }
  
  if (window.SIGNALS_MODE) {
    window.SIGNAL_MAX_TIMEOUT = 20 * 1000;
    log.INFO("Starting pooling for SIGNAL, interval " + SIGNAL_POOLER_TOUT);
    pooler();
  }
  
  window.CALL = CALL;
  window.SIGNAL = SIGNAL;
  window.ON_CALL = ON_CALL;
  window.CLEAR_CALLS = CLEAR_CALLS;
  window.REMOVE_CALL = REMOVE_CALL;
  window.CLEAR_ALL_CALLS = CLEAR_ALL_CALLS;
  window.CLEAR_ALL_SIGNALS = CLEAR_ALL_SIGNALS;
}());
//= require <qubit/widget/base/BaseWidget>

(function () {
  
  var Utils = qubit.widget.utils.Utils,
    log = new qubit.widget.base.Log("TextInput: ");
   
  /**
   * Basic text input widget.
   * 
   * @param config: {
   *  [widget base defaults],
   *  hint: {String} string that will be shown in input field when its empty,
   *  value: {String} initial input value, consider using hint.
   * }
   * 
   * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
   */
  function TextInput(config) {
    if (config) {
      TextInput.superclass.call(this, config);
      this.hintText = config.hint || "Type here...";
      this.inputNode = this.container.children[0];
      this.hintNode = this.container.children[1];
      this.inputNode.value = config.value || "";
      if (config.readOnly) {
        this.inputNode.readOnly = true;
      }
      this.lastInputValue = this.inputNode.value;
      this.hintNode.innerHTML = Utils.secureText(this.hintText);
      
      log.FINE("TextInput(config):");
      log.FINE(config, true);
      
      this._checkIfEmpty();
      
      //simple events
      this.inputNode.onkeypress = this.inputNode.onmousedown =
        this.inputNode.onchange = this.inputNode.onkeyup = function () {
          this._checkIfEmpty();
          return true;
        }.bind(this);

      this.inputNode.onblur = function () {
        this.inputNode.focused = false;
        Utils.removeClass(this.container, "focused");
        this._checkIfEmpty();
        return true;
      }.bind(this);

      this.inputNode.onfocus = function () {
        this.inputNode.focused = true;
        Utils.addClass(this.container, "focused");
        this._checkIfEmpty();
        return true;
      }.bind(this);
      
      this.hintNode.onmousedown = function () {
        try {
          this.inputNode.focus();
        } catch (ex) {
          //swallow, this is IE case only
        }
      }.bind(this);
      
      this.hintNode.onselectstart = function () {
        return false;
      };
    }
  }

  TextInput.superclass = qubit.widget.base.BaseWidget;
  TextInput.prototype = new TextInput.superclass();
  TextInput.prototype.CLASS_NAME = "TextInput";
  TextInput.prototype.className += " qubit-widget-base-text-input";

  /**
   * @private
   * 
   * This is a private method used to validate widgets input field in order to
   * trigger onChange callback and update hint for the input field.
   * 
   * @returns {Boolean}
   */
  TextInput.prototype._checkIfEmpty = function () {
    log.FINE(this.CLASS_NAME + "-> _checkIfEmpty()");
    var returnValue = true;
    if (this.inputNode.value !== "" || this.inputNode.focused) {
      if (this.hintNode.innerHTML !== "") {
        this.hintNode.innerHTML = Utils.secureText("");
      }
      returnValue = false;
    } else if (this.hintNode.innerHTML === "") {
      this.hintNode.innerHTML = Utils.secureText(this.hintText);
    }

    if (this.lastInputValue !== this.inputNode.value) {
      this.lastInputValue = this.inputNode.value;
      if (this.onChange) {
        this.onChange(this.lastInputValue);
      }
    }
    return returnValue;
  };
  
  /**
   * Text input node value setter.
   * 
   * @param {type} value
   * @returns {undefined}
   */
  TextInput.prototype.setValue = function (value) {
    log.FINE(this.CLASS_NAME + "-> setValue(value): " + value);
    this.inputNode.value = value;
    this._checkIfEmpty();
  };
  
  /**
   * Text input node value getter.
   * 
   * @returns {@pro;value@this.inputNode}
   */
  TextInput.prototype.getValue = function () {
    return this.inputNode.value;
  };
  
  //the HTML template
  TextInput.prototype.viewTemplate = [
    '<input type="text"/>',
    '<div class="qubit-widget-base-text-input-cover"></div>'
  ].join('');

  qubit.widget.base = qubit.widget.base || {};
  qubit.widget.base.TextInput = TextInput;

}());

//= require <qubit/widget/base/BaseWidget>

(function () {
  var Utils = qubit.widget.utils.Utils,
    log = new qubit.widget.base.Log("Button: ");
  
  /**
   * @package qubit.widget.base
   * @class Button
   * 
   * Simple widget for button item rendering.
   * Notice config property iconClassName; This is property used to inject icon
   * class name. Icon container in button has 24px height and 0px width by
   * default. It is developer responsibility to prepare a class name and its
   * definition. When you require larger picture as icon, consider enchancing
   * button container class in order to adjust line-height of the text.
   * 
   * Buttons width is automatically adjusted to contained text. If you require
   * any specific rendering, consider additional class names or implementing 
   * customized widget.
   * 
   * @param config: {
   *   [widget base defaults],
   *   text: "button text",
   *   iconClassName: "icon-class-name"
   * }
   * 
   * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
   */
  function Button(config) {
    if (config) {
      Button.superclass.call(this, config);
      this.contentWrapper = this.container.children[0];
      this.containerIcon = this.contentWrapper.children[0];
      this.containerBody = this.contentWrapper.children[1];
      if (config.text) {
        this.setText(config.text);
      }
      if (config.iconClassName) {
        this.setIconClassName(config.iconClassName);
      }
      if (config.clickAction) {
        this.clickAction = config.clickAction;
      }
      this.container.onclick = this.clickHandler.bind(this);
      log.FINE("Button(config):");
      log.FINE(config, true);
    }
  }

  Button.superclass = qubit.widget.base.BaseWidget;
  Button.prototype = new Button.superclass();
  Button.prototype.CLASS_NAME = "Button";
  Button.prototype.className += " qubit-widget-button";
  Button.prototype.tagName = "a";
  Button.prototype.iconClassName = "";
  
  /**
   * Default click handler in this widget. It does check for clickAction 
   * defined in class, if any - will be invoked passing default DOM event
   *  handling. clickAction handler will be run in class context.
   *  
   * @param {type} e
   * @returns {unresolved}
   */
  Button.prototype.clickHandler = function (e) {
    if (this.clickAction) {
      log.FINE(this.CLASS_NAME + "-> clickHandler(e):");
      log.FINE(e, true);
      return this.clickAction(e);
    }
  };
  
  /**
   * Button text content setter.
   * 
   * @param {type} text
   * @returns {undefined}
   */
  Button.prototype.setText = function (text) {
    this.containerBody.innerHTML = Utils.secureText(text);
    this.text = text;
  };
  
  /**
   * Button text content getter.
   * 
   * @returns {String}
   */
  Button.prototype.getText = function () {
    return this.text;
  };
  
  /**
   * Button icon class name setter.
   * 
   * @param {type} text
   * @returns {undefined}
   */
  Button.prototype.setIconClassName = function (name) {
    Utils.removeClass(this.iconClassName);
    this.iconClassName = name;
    Utils.addClass(name);
  };
  
  /**
   * Button icon class name getter.
   * 
   * @returns {String}
   */
  Button.prototype.getIconClassName = function () {
    return this.iconClassName;
  };
  
  /**
   * Button DOM view template.
   * 
   * @type {string}
   */
  Button.prototype.viewTemplate = [
    '<div class="qubit-widget-button-wrapper">',
    '<div class="button-icon">',
    '</div>',
    '<div class="button-body">',
    '</div>',
    '</div>'
  ].join('');

  qubit.widget.base.Button = Button;

}());
//= require <qubit/widget/base/BaseWidget>

/**
 * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
 */
(function () {
  var log = new qubit.widget.base.Log("ListItem: ");
  /**
   * Widget for simple list item rendering.
   * 
   * @param config : {
   *  [widget base defaults]
   * }
   * 
   * @author peter.fronc@qubitproducts.com
   */
  function ListItem(config) {
    if (config) {
      ListItem.superclass.call(this, config);
      log.FINE("ListItem(config):");
      log.FINE(config, true);
    }
  }

  ListItem.superclass = qubit.widget.base.BaseWidget;
  ListItem.prototype = new ListItem.superclass();
  ListItem.prototype.CLASS_NAME = "ListItem";
  ListItem.prototype.className = " qubit-widget-base-list-item";
  
  /**
   * ListItem DOM view template.
   * 
   * @type {string}
   */
  ListItem.prototype.viewTemplate = [
    ''
  ].join('');

  qubit.widget.base.ListItem = ListItem;

}());
//= require <qubit/widget/base/BaseWidget>
//= require <qubit/widget/utils/Positioning>

/*
 * OpenTag, a tag deployment platform
 * Copyright 2011-2013, QuBit Group
 * http://opentag.qubitproducts.com
 * 
 * @author Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>ç 
 */
(function () {
  var log = new qubit.widget.base.Log("Dialog: "),
    Utils = qubit.widget.utils.Utils,
    Positioning = qubit.widget.utils.Positioning;
  
  /**
   * Widget for simple list item rendering.
   * 
   * @param config : {
   *  [widget base defaults]
   * }
   * 
   * @author peter.fronc@qubitproducts.com
   */
  function Dialog(config) {
    if (config) {
      Dialog.superclass.call(this, config);
      log.FINE("Dialog(config):");
      log.FINE(config, true);
      this.parentContainer = this.parentContainer || document.body;
      this.contentNode = this.container.children[1];
      this.headNode = this.container.children[0];
      this.closeNode = this.container.children[0].children[0];
      
      if (this.contentTemplate) {
        this.getChildrenContainer().innerHTML = this.contentTemplate;
      }
      this.moveable = !!config.moveable;
      this.closeNode.onclick = function (e) {
        this.close();
      }.bind(this);
    }
  }

  Dialog.superclass = qubit.widget.base.BaseWidget;
  Dialog.prototype = new Dialog.superclass();
  Dialog.prototype.CLASS_NAME = "Dialog";
  Dialog.prototype.className = " qubit-widget-base-dialog " +
    "deep-shadows-rounded";
  
  Dialog.prototype.getChildrenContainer = function () {
    return this.contentNode;
  };
  
  Dialog.prototype.paint = function () {
    Dialog.superclass.prototype.paint.call(this);
    this.coverScreen();
    Positioning.centerElement(this.container);
    if (this.moveable) {
      var positioner = new Positioning(this.container);
      positioner.makeMoveable(this.headNode);
    }
  };
  
  Dialog.prototype.coverScreen = function () {
    if (!this.screenCover) {
      this.screenCover = document.createElement("div");
      Utils.addClass(this.screenCover, "dialog-screen-cover");
    }
    document.body.appendChild(this.screenCover);
  };
  
  Dialog.prototype.uncoverScreen = function () {
    try {
      document.body.removeChild(this.screenCover);
    } catch (ex) {
      log.FINE("Tried removing screen cover: " + ex);
    }
  };
  
  Dialog.prototype.close = function () {
    log.FINE("Closing...");
    this.uncoverScreen();
    try {
      this.onClose();
    } finally {
      this.destroy();
    }
  };
  
  Dialog.prototype.onClose = function () {};
  
  /**
   * Dialog DOM view template.
   * 
   * @type {string}
   */
  Dialog.prototype.viewTemplate = [
    '<div class="head"><div class="close-button"></div>',
    '</div>',
    '<div class="container"></div>'
  ].join('');

  Utils.namespace("qubit.widget.base.Dialog", Dialog);
}());

/*NO LOG*/
/* jshint white: false */

(function () {
  
  var c = window.console;
  
  /**
   * @class qubit.qtag.Log
   * 
   * ## Logging class
   * 
   * ALWAYS USE LOGGER IN A SEPARATE LINES. Lines containing logger 
   * may be deleted by compression process.
   * 
   * Author: Inz. Piotr (Peter) Fronc <peter.fronc@qubitdigital.com>
   */
  function Log(prefix, clazz) {
    this.getPrefix = function () {
      var clz = "";
      if (clazz) {
        if (typeof clazz === "function") {
          clz = clazz();
        } else if (clazz.CLASS_NAME) {
          clz = clazz.CLASS_NAME;
        } else if (clazz.constructor && clazz.constructor.name) {
          clz = clazz.constructor.name;
        }
        if (clz) {
          clz += " -> ";
        }
      }
      return (prefix || "") + clz;
    };
  }

  /**
   * Static property used to define finest level.
   * @property {Number} [LEVEL_FINEST=4]
   */
  Log.LEVEL_FINEST = 4;
  /**
   * Static property used to define fine level.
   * @property {Number} [LEVEL_FINE=3]
   */
  Log.LEVEL_FINE = 3;
  /**
   * Static property used to define informative level.
   * @property {Number} [LEVEL_INFO=2]
   */
  Log.LEVEL_INFO = 2;
  /**
   * Static property used to define severe level.
   * @property {Number} [LEVEL_WARN=1]
   */
  Log.LEVEL_WARN = 1;
  /**
   * Static property used to define severe level.
   * @property {Number} [LEVEL_ERROR=0]
   */
  Log.LEVEL_ERROR = 0;
  
  /**
   * @property {Number} [LEVEL_NONE=-1]
   * Static property used to define no logging level.
   */
  Log.LEVEL_NONE = -1;
  
  /**
   * @property LEVEL
   * 
   * `Log.LEVEL` property is used to controll globally current and default loggin
   * level.
   * Choose from Log.LEVEL_* properties to adjust system logging output.
   * 
   * Example:


        var Log = qubit.qtag.Log;
        qubit.qtag.Log.LEVEL = Log.LEVEL_FINEST;

   *  will enable all logs to 
   * be at output.
   * 
 

        var Log = qubit.qtag.Log;
        Log.LEVEL = Log.LEVEL_NONE;
   * will disable any logs.
   */
  Log.LEVEL = Log.LEVEL_ERROR;
  Log.LEVEL = Log.LEVEL_FINE;/*D*///line deleted during merge
  
  /**
   * @protected
   * Print method.
   * Override this method if you prefer different logging output.
   * By default all messages are redirected to console.
   * This method is used by all logging methods as final output.
   * 
   * @param {String} message Message to be logged. 
   * @returns {undefined}
   */
  Log.prototype.print = function (message, style) {
    if (c && c.log) {
      if (style){
        c.log("%c" + message, style +";font-family: 'Courier New', monospace;");
      } else {
        c.log(message);
      }
    }
  };
  
  //it is important it is not in one line. New build will strip logs for release
  /**
   * @method
   * Finest level logging function.
   * 
   * @param {String} message Message to be logged.
   * @param {Boolean} plain If true, message object will be logged as plain as 
   *    passed directly to console. It's usefull if your console supports JSON 
   *    style browsing objects.
   * @returns {undefined}
   */
  Log.prototype.
    FINEST = function (message, plain) {
      if (Log.LEVEL >= Log.LEVEL_FINEST) {
        if (plain) {
          this.print(message);
        } else {
          this.print("FINEST: " + this.getPrefix() + message, "color:#CCCCCC;");
        }
      }
    };
    
  /**
   * @method
   * Fine level logging function.
   * 
   * @param {String} message Message to be logged.
   * @param {Boolean} plain If true, message object will be logged as plain as 
   *    passed directly to console. It's usefull if your console supports JSON 
   *    style browsing objects.
   * @returns {undefined}
   */
  Log.prototype.
    FINE = function (message, plain) {
      if (Log.LEVEL >= Log.LEVEL_FINE) {
        if (plain) {
          this.print(message, plain);
        } else {
          this.print("FINE: " + this.getPrefix() + message, "color:#999999;");
        }
      }
    };
  
  /**
   * @method
   * Information level logging function.
   * 
   * @param {String} message Message to be logged.
   * @param {Boolean} plain If true, message object will be logged as plain as 
   *    passed directly to console. It's usefull if your console supports JSON 
   *    style browsing objects.
   * @returns {undefined}
   */
  Log.prototype.
    INFO = function (message, plain, style) {
      if (Log.LEVEL >= Log.LEVEL_INFO) {
        if (plain) {
          this.print(message, plain);
        } else {
          this.print("INFO: " + this.getPrefix() + message, ";");
        }
      }
    };
  
  /**
   * @method
   * Severe/Error level logging function.
   * 
   * @param {String} message Message to be logged.
   * @param {Boolean} plain If true, message object will be logged as plain as 
   *    passed directly to console. It's usefull if your console supports JSON 
   *    style browsing objects.
   * @returns {undefined}
   */
  Log.prototype.
    WARN = function (message, plain) {
      if (Log.LEVEL >= Log.LEVEL_WARN) {
        if (plain) {
          this.print(message, plain);
        } else {
          this.print("WARN: " + this.getPrefix() + message, "color:#26A110;");
        }
      }
    };
    
  /**
   * @method
   * Severe/Error level logging function.
   * 
   * @param {String} message Message to be logged.
   * @param {Boolean} plain If true, message object will be logged as plain as 
   *    passed directly to console. It's usefull if your console supports JSON 
   *    style browsing objects.
   * @returns {undefined}
   */
  Log.prototype.
    ERROR = function (message, plain) {
      if (Log.LEVEL >= Log.LEVEL_ERROR) {
        if (plain) {
          this.print(message, plain);
        } else {
          this.print("ERROR: " + this.getPrefix() + message, "color:red;");
        }
      }
    };
  
  qubit.widget = qubit.widget || {};
  qubit.widget.base = qubit.widget.base || {};
  qubit.widget.base.Log = Log;
}());
//= require <qubit/widget/base/TextInput>
//= require <qubit/widget/base/Dialog>

/*
 * OpenTag, a tag deployment platform
 * Copyright 2011-2013, QuBit Group
 * http://opentag.qubitproducts.com
 */

(function () {
  
  var Dialog = qubit.widget.base.Dialog,
    Utils = qubit.widget.utils.Utils,
    TextInput = qubit.widget.base.TextInput,
    log = new qubit.widget.base.Log("VariableDefaultValueDialog: "),
    Positioning = qubit.widget.utils.Positioning;
  
  /**
   * Variable Default Dialog
   * Simple dialog for default value getting.
   * 
   * @param config : {
   *  [widget base defaults],
   *  onSave: function to be triggered on save click,
   *  inputValue: initial input value
   * }
   * 
   * @author peter.fronc@qubitproducts.com
   */
  function VariableDefaultValueDialog(config) {
    if (config) {
      VariableDefaultValueDialog.superclass.call(this, config);
      log.FINE("VariableDefaultValueDialog(config):");
      log.FINE(config, true);
      this.input = new TextInput({
        hint: "leave empty if no defaults should be used"
      });
      
      this.saveButton = new qubit.widget.base.Button({
        text: "Save",
        className: "green float-right"
      });
      
      this.cancelButton = new qubit.widget.base.Button({
        text: "Cancel",
        className: "float-right"
      });
      
      this.saveButton.clickAction = function () {
        if (this.onSave) {
          this.onSave();
        }
        this.close();
      }.bind(this);
      
      this.cancelButton.clickAction = function () {
        this.close();
      }.bind(this);
      
      this.add(this.input);
      this.add(this.saveButton);
      this.add(this.cancelButton);
      
      if (config.onSave) {
        this.onSave = config.onSave;
      }
            
      if (config.inputValue) {
        this.input.setValue(config.inputValue);
      }
    }
  }

  VariableDefaultValueDialog.superclass = Dialog;
  VariableDefaultValueDialog.prototype =
    new VariableDefaultValueDialog.superclass();
    
  VariableDefaultValueDialog.prototype.CLASS_NAME =
    "VariableDefaultValueDialog";
  VariableDefaultValueDialog.prototype.className +=
    " variable-default-value";
  
  /**
   * VariableDefaultValueDialog DOM view template.
   * 
   * @type {string}
   */
  VariableDefaultValueDialog.prototype.contentTemplate = [
    '<h1>Set Default Value For Parameter</h1>',
    '<div class="height-margins-8px">',
    'The value entered will be used as a plain javascript.',
    '</div>'
  ].join('');

  Utils.namespace("qubit.widget.VariableDefaultValueDialog",
    VariableDefaultValueDialog);

}());

//document.ondblclick = function () {
//  (new qubit.widget.base.VariableDefaultValueDialog({})).paint();
//};
//= require <qubit/widget/base/List>
//= require <qubit/widget/SaveHistoryItem>
//= require <qubit/widget/base/TextInput>
//= require <qubit/widget/base/Button>

(function () {
  var SaveHistoryItem = qubit.widget.SaveHistoryItem,
    TextInput = qubit.widget.base.TextInput,
    Utils = qubit.widget.utils.Utils,
    Button = qubit.widget.base.Button,
    log = new qubit.widget.base.Log("SaveHistory: "),
    /*
     * Important regex. It defines chich characters will be allowed for
     * REGEX queries in the search field. Characters matching patternRegex
     * will be EXCLUDED from search.
     * @type RegExp
     */
    patternRegex = new RegExp("[^\\w\\s_@\\-\\.]+", "g"),
    /* @const
     * Constant string displayed when there is no save history items.
     * @type String
     */
    NO_COMMITS_HISTORY_TXT = "No commits history.",
    /* @const
     * Constant string displayed when there is no save history items matching
     * search pattern.
     * @type String
     */
    NO_ITEMS_FOUND_TXT = "No items matching your query.";

  /**
   * Expandable list widget for save history list rendering.
   * @param config : {
   *  [widget base defaults],
   *  url: {String} url, if url is passed, the profileId will be ignored,
   *   this URL must be GET service producing JSON with SaveHistoryItem valid
   *   entries objects array. Very useful for mocking.
   *  profileId: {String} profile ID that history will be fetched,
   *  startFromPage: {Number} which page to start from,
   *  displayRange: {Number} how many pages to display on a single page
   * }
   * 
   * @author peter.fronc@qubitproducts.com
   */
  function SaveHistory(config) {
    if (config) {
      log.FINE("initialising with config:");
      log.FINE(config, true);
      SaveHistory.superclass.call(this, config);
      
      this.historyItems = [];
      this.filteredHistoryItems = this.historyItems;
      this.currentFilterPattern = null;
      this.currentPageItems = [];
      this.currentPageNumber = 1;
      
      this.navigationContainer = this.container.children[0];
      this.headContainer = this.container.children[1];
      this.bodyContainer = this.container.children[2];
      this.searchHeaderContainer = this.headContainer.children[6];
      this.footContainer = this.container.children[3];
      
      this.backButton = new Button({
        text: "back to Dashboard"
      });
      
      this.add(this.backButton, this.navigationContainer);
      
      this.backButton.clickAction = function () {
        qubit.qtag.WindowManager.showDashboard();
        this.destroy(true); //deep!
      }.bind(this);
      
            
      this.searchWidget = new TextInput({
        className: "qubit-widget-history-search-input rounded",
        hint: "filter by author, change"
      });
      
      this.add(this.searchWidget, this.searchHeaderContainer);
      
      this.searchWidget.onChange = function (value) {
        if (value === this.lastSearchValue) {
          return;
        }
        log.FINE(this.CLASS_NAME + "-> serachWidget.onChange:" + value);
        this.lastSearchValue = value;
        if (value) {
          this.setViewByPages(1, this.filter(value), NO_ITEMS_FOUND_TXT);
        } else {
          this.setViewByPages(this.currentPageNumber, this.filter(value));
        }
      }.bind(this);
      
      this.paint();
      
      if (config.url) {
        log.FINE("loading data with URL: " + config.url);
        this.loadData(config.url);
      } else if (config.profileId) {
        log.FINE("loading data with profileId: ");
        log.FINE(config.profileId);
        this.loadDataForProfileId(config.profileId);
      }
      
      this.startFromPage = config.startFromPage || 0;
      this.displayRange = +config.displayRange;
      
      this.footContainer.onclick = this.footOnClickHandler.bind(this);
    }
  }

  SaveHistory.superclass = qubit.widget.base.List;
  SaveHistory.prototype = new SaveHistory.superclass();
  SaveHistory.prototype.CLASS_NAME = "SaveHistory";
  SaveHistory.prototype.className += " qubit-widget-save-history";
  /**
   * Contains all of the items in this list.
   * @type {Array[qubit.widget.SaveHistoryItem]}
   */
  SaveHistory.prototype.historyItems = null;
  /**
   * Contains all of the filtered items in this list.
   * @type {Array[qubit.widget.SaveHistoryItem]}
   */
  SaveHistory.prototype.filteredHistoryItems = null;
  /**
   * Contains current pattern used to search items.
   * @type {String}
   */
  SaveHistory.prototype.currentFilterPattern = null;
  /**
   * Contains all of the items displayed on the current page.
   * @type {Array[qubit.widget.SaveHistoryItem]}
   */
  SaveHistory.prototype.currentPageItems = null;
  /**
   * Contains current page number.
   * @type {Array[qubit.widget.SaveHistoryItem]}
   */
  SaveHistory.prototype.currentPageNumber = 1;
  /**
   * Save History widget html template string.
   * @type {string}
   */
  SaveHistory.prototype.viewTemplate = [
    '<div class="navigation">',
    '</div>',
    '<div class="head">',
    '<div class="column version"> Version </div>',
    '<div class="column active-tags"> Active Tags </div>',
    '<div class="column inactive-tags"> Inactive Tags </div>',
    '<div class="column creation-date"> Created </div>',
    '<div class="column last-saved-date"> Last Published </div>',
    '<div class="column author"> Author </div>',
    '<div class="column search"></div>',
    '</div>',
    '<div class="body rounded-corners-4px default-shadows">',
    '</div>',
    '<div class="item-foot">',
    '',
    '</div>'
  ].join('');

  /**
   * Function used to add history items by using JS notation objects.
   * It will respect currently applied view filter (from search input).
   * 
   * @param {[Object]} objects acceptable as aentries property in
   *  SaveHistoryItem constructor.
   */
  SaveHistory.prototype.addHistoryItemsByJSONObject = function (object) {
    var items = object, i = 0, tmp = [];

    for (; i < items.length; i += 1) {
      tmp.push(new SaveHistoryItem({
        entries: items[i]
      }));
    }
    
    this.historyItems = tmp.concat(this.historyItems);
    this.filter(this.currentFilterPattern);
  };
  
  /**
   * Function used to set current page of save history list items pages.
   * It will respect currently applied view filter (from search input) and
   * is/should be re-run when such filtering is updated.
   * 
   * @param {type} fromPageNumber, wanted page number
   * @param {Array[qubit.widget.SaveHistoryItem]} optional save history
   *  items to be displayed or this.filteredHistoryItems as default
   * @returns {Number} page number that was set
   */
  SaveHistory.prototype.setViewByPages = 
    function (fromPageNumber, items, emptyMessage) {
      log.FINE(this.CLASS_NAME + "-> setViewByPages([args]): ");
      log.FINE(arguments, true);
      var pages = 0, fromItem = 0,
        to = -1, i = 0,
        allItems = items || this.filteredHistoryItems;
      emptyMessage = emptyMessage || NO_COMMITS_HISTORY_TXT;

      fromPageNumber = fromPageNumber || 1;

      if (this.displayRange) {
        pages = Math.ceil(allItems.length / this.displayRange);
        fromItem = (fromPageNumber - 1) * this.displayRange;
        to = fromItem + this.displayRange;
      }

      for (i = 0; i < this.currentPageItems.length; i += 1) {
        this.remove(this.currentPageItems[i]);
      }

      this.currentPageItems = allItems.slice(fromItem, to);

      if (this.currentPageItems && this.currentPageItems.length > 0) {
        this.getChildrenContainer().innerHTML = "";
      } else {
        this.getChildrenContainer().innerHTML =
          '  <div class="empty-item">' + emptyMessage + '</div>';
      }

      this.addItems(this.currentPageItems);

      this.footContainer.innerHTML =
        this.generateFooterHTML(pages, fromPageNumber);

      return fromPageNumber;
    };
  
  /**
   * Local function that check the node for matching string in search.
   * It does clean the node from previous tags first and apply new one if found.
   * 
   * @param {type} node DOMNode to provide innerHTML to be matched
   * @param {type} pattern regex pattern to be applied
   * @param {replace} string used to replace match
   * @returns {Boolean} true if any match exists
   */
  function doesItemNodeMatchPattern(node, pattern, replace, onlyCheck) {
    log.FINE("PRIVATE: doesItemNodeMatchPattern:" +
      /*.FINE(*/"(node, pattern, replace, onlyCheck)");
    log.FINE(arguments, true);
    
    if (node.originInnerHTML) {
      node.innerHTML = node.originInnerHTML;
      node.originInnerHTML = false;
    }
    if (node.innerHTML.match(pattern)) {
      if (!onlyCheck && pattern.length > 0) {
        node.originInnerHTML = node.innerHTML;
        node.innerHTML = Utils.replaceAll(
          node.innerHTML,
          pattern,
          "<font class=\"highlight\">" +
          replace +
          "</font>"
        );
      }
      log.FINE("PRIVATE: doesItemNodeMatchPattern: " + true);
      return true;
    }
    log.FINE("PRIVATE: doesItemNodeMatchPattern: " + false);
    return false;
  }
  
  /**
   * This function filters all SaveHistoryItem items according to the pattern
   * passed. It does not update view.
   * 
   * @param {String} string pattern
   * @returns {undefined}
   */
  SaveHistory.prototype.filter = function (pattern) {
    log.FINE(this.CLASS_NAME + "-> filter(pattern): " + pattern);
    var found = [], i = 0, allItems = this.historyItems, item, match, replace;
    
    if (pattern && !Utils.replaceAll(pattern, " ", "")) {
      pattern = ""; //treat all spaces only as empty pattern
    }
    
    this.currentFilterPattern = pattern;
    
    if (typeof (pattern) === "string") {
      replace = pattern.replace(patternRegex, "");
      pattern = Utils.replaceAll(replace, "\\.", "\\.");
      for (; i < allItems.length; i += 1) {
        item = allItems[i];
        match =
          doesItemNodeMatchPattern(item.versionNode, pattern, replace);
        match = 
          doesItemNodeMatchPattern(item.activeTagsNode, pattern, replace) ||
          match;
        match = 
          doesItemNodeMatchPattern(item.inactiveTagsNode, pattern, replace) ||
          match;
        match = 
          doesItemNodeMatchPattern(item.creationDateNode, pattern, replace) ||
          match;
        match =
          doesItemNodeMatchPattern(item.lastSavedDateNode, pattern, replace) ||
          match;
        match =
          doesItemNodeMatchPattern(item.authorNode, pattern, replace) ||
          match;
        if (match) {
          found.push(item);
        }
      }
    } else {
      found = allItems;
    }
    log.FINE(this.CLASS_NAME + "-> filter(...): Found:");
    log.FINE(found, true);
    this.filteredHistoryItems = found;
  };

  /**
   * Function generates footer with its pagination items.
   * 
   * @param {Number} pages amount
   * @param {Number} current page index
   * @returns {String} HTML string
   */
  SaveHistory.prototype.generateFooterHTML = function (pages, current) {
    var footer = "", index = 1;
    while (pages >= index) {
      if (current !== index) {
        footer += "<a action='page'>" + index + "</a> ";
      } else {
        footer += "<a class='current'>" + index + "</a> ";
      }
      index += 1;
    }
    return footer;
  };
  
  /**
   * Click handler on footer. It does simple action check on elements and sets
   * page view accordingly to the number.
   * 
   * @param {Event} DOM event object
   * @returns {undefined}
   */
  SaveHistory.prototype.footOnClickHandler = function (event) {
    log.FINE(this.CLASS_NAME + "-> footOnClickHandler(event):");
    log.FINE(event, true);
    var srcElement = Utils.getSrcElement(event), page = 1;
    if (srcElement.getAttribute("action") === "page") {
      page = +srcElement.innerHTML;
      this.currentPageNumber = this.setViewByPages(page);
    }
  };
  
  SaveHistory.prototype.getChildrenContainer = function () {
    return this.bodyContainer;
  };
  
  /**
   * Data loader for profile ID.
   * 
   * @param {Number} profile ID
   * @returns {undefined}
   */
  SaveHistory.prototype.loadDataForProfileId = function (profileId) {
    log.FINE(this.CLASS_NAME + "-> loadDataForProfileId(profileId):");
    log.FINE(profileId, true);
    
    qubit.qtag.data.dao.ProfileDAO
      .fetchProfileHistory(profileId, this.dataLoadedHandler.bind(this));
  };
  
  /**
   * Plain URL data loader. Usefull for mock applications.
   * 
   * @param {type} url
   * @returns {undefined}
   */
  SaveHistory.prototype.loadData = function (url) {
    log.FINE(this.CLASS_NAME + "-> loadData(url):");
    log.FINE(url, true);
    dojo.xhrGet({
      url: url,
      handleAs: "json",
      preventCache: false,
      load: this.dataLoadedHandler.bind(this),
      error: qubit.globalErrorHandler
    });
  };
  
  /**
   * Data loading handler for save history pages view.
   * 
   * @param {Array[SaveHistoryItem]} data
   * @returns {undefined}
   */
  SaveHistory.prototype.dataLoadedHandler = function (data) {
    log.FINE("-> loaded data for history: ");
    log.FINE(data, true);
    this.addHistoryItemsByJSONObject(data);
    this.currentPageNumber = this.setViewByPages(1);
  };
  
  qubit.widget.SaveHistory = SaveHistory;

}());

//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/qtag/ScriptChooser>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/PasswordStrengthIndicator>
//= require <qubit/Terms>
//= require <qubit/Privacy>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  dojo.declare("qubit.Footer", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qubit.templates", "Footer.html?cb=" + 
          qubit.v),
      postCreate: function () {
        dojo.connect(this.terms, "onClick", this, function () {
          var x = new qubit.Terms();
          x.show();
        });
        dojo.connect(this.privacy, "onClick", this, function () {
          var x = new qubit.Privacy();
          x.show();
        });
      }
    });
  
});
//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/qtag/ScriptChooser>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/PasswordStrengthIndicator>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  dojo.declare("qubit.Terms", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qubit.templates", "Terms.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Site Terms and Conditions of Use"
        });
        this.inherited(arguments);
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
      },
      hide: function () {
        this.popup.destroy();
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/util/MultiSelectOption>

dojo.require("dojo.cache");

dojo.addOnLoad(function () {
  dojo.declare(
    "qubit.util.MultiSelectOption",
    [dijit._Widget, dijit._Templated],
    {
      templateString: dojo.cache("qubit.templates", 
        "MultiSelectOption.html?cb=" + qubit.v),
      postCreate: function () {
        this.inherited(arguments);
        qubit.Util.setText(this.nameField, this.option.name.substring(0, 30) + 
            (this.option.name.length > 30 ? "..." : ""));
        this.nameField.title = this.option.name;
      }
    }
  );
});
dojo.require("dijit.form.Textarea");
dojo.require("dijit.form.ValidationTextBox");

dojo.addOnLoad(function () {
  dojo.declare(
    "qubit.util.ValidationTextarea",
    [dijit.form.ValidationTextBox, dijit.form.Textarea],
    {
      invalidMessage: "This field is required",
  
      postCreate: function () {
        this.inherited(arguments);
      },
  
      validate: function () {
        this.inherited(arguments);
        if (arguments.length === 0) {
          this.validate(true);
        }
      },
  
      validator: function (value, constraints) {
        // Override base behavior of using a RegExp, it is unnecessarily
        // complex and fails on multiple lines contained in a Textarea.
        return !this._isEmpty(value);
      },
  
      _onInput: function () {
        this.inherited(arguments);
        // Validate as you type, means any widgets which depend on this get
        // updated without user having to click elsewhere to trigger onBlur.
        this.validate();
      },
  
      onFocus: function () {
        if (!this.isValid()) {
          this.displayMessage(this.getErrorMessage());
        }
      },
  
      onBlur: function () {
        // Force the popup of the invalidMessage.
        this.validate(false);
      }
    }
  );
});
//= require <qubit/GLOBAL>
//= require <qubit/util/MultiSelectOption>

dojo.require("dojo.cache");

dojo.addOnLoad(function () {
  dojo.declare(
    "qubit.util.MultiSelect",
    [dijit._Widget, dijit._Templated],
    {
      widgetsInTemplate: true,
      templateString: dojo.cache("qubit.templates", "MultiSelect.html?cb=" + 
        qubit.v),
      postCreate: function () {
        this.inherited(arguments);
        this.addAllOptions();
        if (this.unselectedHeadingText) {
          qubit.Util.setText(this.unselectedHeading, 
              this.unselectedHeadingText);
        }
        if (this.selectedHeadingText) {
          qubit.Util.setText(this.selectedHeading, this.selectedHeadingText);
        }
        dojo.connect(this.addAllButton, "onClick", this, this.addAll);
        dojo.connect(this.addOneButton, "onClick", this, this.addOne);
        dojo.connect(this.removeOneButton, "onClick", this, this.removeOne);
        dojo.connect(this.removeAllButton, "onClick", this, this.removeAll);
        this.selectedCurrent = null;
        this.unselectedCurrent = null;
      },
      updateEmpty: function () {
        this.showEmpty("selected", this.selectedNodes.length > 0);
        this.showEmpty("unselected", this.unselectedNodes.length > 0);
      },
      showEmpty: function (name, shouldHide) {
        dojo[(shouldHide ? "add" : "remove") + "Class"](this[name + "Empty"], 
          "hidden");
      },
      addOptions: function (name) {
        this[name + "Nodes"] = [];
        dojo.forEach(this[name], 
            dojo.hitch(this, dojo.partial(this.addOption, name)));
      },
      addOption: function (name, option) {
        var optionNode = qubit.util.MultiSelectOption({
          option: option
        });
        dojo.connect(optionNode.domNode, "onclick", 
          this, this.optionSelected(name, optionNode));
        this[name + "Nodes"].push(optionNode);
        optionNode.placeAt(this[name + "Options"]);
      },
      optionSelected: function (name, option) {
        return function () {
          dojo.forEach(this[name + "Nodes"], function (o) {
            dojo.removeClass(o.domNode, "selected");
          });
          dojo.addClass(option.domNode, "selected");
          this[name + "Current"] = option;
        };
      },
      addAll: function () {
        this.doAll("unselected", "selected");
      },
      removeAll: function () {
        this.doAll("selected", "unselected");
      },
      doAll: function (fromName, toName) {
        dojo.forEach(this[fromName + "Nodes"], 
          dojo.hitch(this, function (option) {
            dojo.destroy(option.domNode);
            this.addOption(toName, option.option);
          }));
        this[fromName + "Nodes"] = [];
        this.updateEmpty();
      },
      addOne: function () {
        this.doOne("unselected", "selected");
      },
      removeOne: function () {
        this.doOne("selected", "unselected");
      },
      doOne: function (fromName, toName) {
        var option = this[fromName + "Current"]; 
        if (option) {
          dojo.destroy(option.domNode);
          this[fromName + "Nodes"] = _.filter(this[fromName + "Nodes"], 
            function (o) {
              return o.option.name !== option.option.name;
            });
          this[fromName + "Current"] = null;
          this.addOption(toName, option.option);
          this.updateEmpty();
        }
      },
      getState: function () {
        return {
          selected: dojo.map(this.selectedNodes, function (option) {
            return option.option;
          }),
          unselected: dojo.map(this.selectedNodes, function (option) {
            return option.option;
          })
        };
      },
      setData: function (allData, selectedIds) {
        this.selected = _.filter(allData, function (option) {
          return _.include(selectedIds, option.id);
        });
        this.unselected = 
          _.without.apply(this, [].concat([allData], this.selected));
        this.addAllOptions();
      },
      addAllOptions: function () {
        this.addOptions("selected");
        this.addOptions("unselected");
        this.updateEmpty();
      }
    }
  );
});
//= require <qubit/GLOBAL>
//= require <qubit/Util>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  dojo.declare("qubit.util.Status", [dijit._Widget, dijit._Templated], {
    templateString: dojo.cache("qubit.templates", "Status.html?cb=" + 
        qubit.v),
    postCreate: function () {
      this.inherited(arguments);
    },
    error: function (message) {
      dojo.removeClass(this.messageContainer, "success");
      dojo.addClass(this.messageContainer, "error");
      this._showMessage(message);
    },
    success: function (message) {
      dojo.removeClass(this.messageContainer, "error");
      dojo.addClass(this.messageContainer, "success");
      this._showMessage(message);
    },
    _showMessage: function (message) {
      qubit.Util.setText(this.message, message);
      dojo.style(this.messageContainer, "display", "block");
      dojo.fadeIn({node: this.messageContainer}).play();
    },
    hide: function () {
      dojo.style(this.messageContainer, "display", "none");
      dojo.style(this.messageContainer, "opacity", "0");
    }
  });
});
//= require <qubit/GLOBAL>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.Tooltip");

dojo.addOnLoad(function () {
  dojo.declare("qubit.util.HelpButton", [dijit._Widget, dijit._Templated], {
    widgetsInTemplate: true,
    templateString: dojo.cache("qubit.templates", "HelpButton.html?cb=" + 
        qubit.v),
    text: "",
    postCreate: function () {
      this.inherited(arguments);
      if (!this.iconHolder.id) {
        this.iconHolder.id = "HelpButton_iconHolder" + 
          qubit.util.HelpButton.holderId;
        qubit.util.HelpButton.holderId += 1;
      }
//      dojo.connect(this.iconHolder, "onclick", this, this.showTooltip);
      setTimeout(dojo.hitch(this, this.showTooltip), 500);
    },
    showTooltip: function () {
      var x = new dijit.Tooltip({
        connectId: [this.iconHolder.id],
        label: this.text
      });
    }
  });
  qubit.util.HelpButton.holderId = 1; 
});
//= require <qubit/GLOBAL>

(function () {
  qubit.Helper = {};
  
  qubit.Helper.waitForBody = function (fun) {
    var _this = this, body;
    
    this.bodyCallbacks = this.bodyCallbacks || [];
    if (fun) {
      this.bodyCallbacks.push(fun);
    }

    if (this.bodyPresent) {
      //always async
      setTimeout(function () {
        var exe;
        while (_this.bodyCallbacks.length > 0) {
          exe = _this.bodyCallbacks.shift();
          try {
            exe();
          } catch (ex) {
          }
        }
      }, 0);
    } else {
      body = document.body;
      if (body) {
        this.bodyPresent = true;
      } else {
        setTimeout(function () { _this.waitForBody(); }, 20);
      }
    }
  };
  
  qubit.Helper.removeNullOrUndefined = function (array) {
    var i;
    for (i = 0; i < array.length; i += 1) {
      if (array[i] === undefined || array[i] === null) {
        array.splice(i, 1);
      }
    }
  };
}());
//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/qtag/ScriptChooser>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/PasswordStrengthIndicator>
//= require <qubit/util/Status>
//= require <qubit/Footer>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.TextBox");
dojo.require("dojox.validate");
dojo.require("dojox.validate.web");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dijit.form.Button");

dojo.registerModulePath("qubit.templates", "/QDashboard/qubit/templates/");
dojo.registerModulePath("qtag.templates", "/QDashboard/qtag/templates/");

dojo.addOnLoad(function () {
  dojo.declare("qubit.Register", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qubit.templates", "Register.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.inherited(arguments);
      },
      postCreate: function () {
        _gaq.push(['_trackPageview', '/Register']);
        this.inherited(arguments);
        dojo.connect(this.form, "onSubmit", this, this.submitForm);
        this.passwordStrengthIndicator =
          new qubit.qtag.PasswordStrengthIndicator();
        this.passwordStrengthIndicator.setValueField(this.reg_password);
        this.passwordStrengthIndicator.placeAt(
          this.password_strength_indicator
        );
        this.reg_emailReentry.validator = dojo.hitch(this, function () {
          return this.reg_emailReentry.getValue() === this.reg_email.getValue();
        });
        dojo.connect(this.terms, "onClick", this, function () {
          var x = new qubit.Terms();
          x.show();
        });
      },
      submitForm: function (e) {
        this.registerButton.set("disabled", true);
        if (this.form.validate()) {
          if (!this.agreeCheckbox.checked) {
            alert("Please agree to the terms and conditions");
            this.registerButton.set("disabled", false);
          } else {
            var values = this.form.getValues();
            qubit.data.UserManager.register(values.email, "", 
                values.password, dojo.hitch(this, this.registrationComplete));
          }
        } else {
          this.registerButton.set("disabled", false);
        }
        dojo.stopEvent(e);
      },
      registrationComplete: function (success, errorCode, reason) {
        if (!success) {
          this.registerButton.set("disabled", false);
          this.status.error(reason);
        } else {
          if (window.userRegistered) {
            window.userRegistered();
          }
          window.location = window.location.href.substring(0, 
            window.location.href.indexOf("/register.html") + 1);
        }
      }
    });
});
//= require <qubit/GLOBAL>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Button");

dojo.addOnLoad(function () {
  dojo.declare("qubit.ChangePaymentSettingsSuccess", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qubit.templates", 
        "ChangePaymentSettingsSuccess.html?cb=" + 
        qubit.v),
      postCreate: function () {
        dojo.connect(this.doneButton, "onClick", this, this.doClose);
      },
      doClose: function () {
        this.onClose();
      },
      onClose: function () {
        
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/data/dao/CustomVarDAO>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.Button");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CreateScriptLibraryParam", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Create Script Template Parameter",
      templateString: dojo.cache("qtag.templates", 
          "CreateScriptLibraryParam.html?cb=" + qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Create Custom " + 
            (this.param ? this.param.paramName : "Variable")
        });
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        dojo.connect(this.valueType, "onChange", 
            this, this.valueTypeSelected);
        dojo.connect(this.form, "onSubmit", this, this.submitForm);
        dojo.connect(this.cancel, "onClick", this, this.hide);
        this.addOptions();
        
        if (this.param) {
          this.populate(this.param);
        }
        dojo.connect(this.varType, "onChange",  this, this.varTypeSelected);
      },
      varTypeSelected: function () {
        if (this.varType.getValue() === "-1") {
          dojo.removeClass(this.universalVarHolder, "hidden");
        } else {
          dojo.addClass(this.universalVarHolder, "hidden");
        }
      },
      populate: function (param) {
        this.nameField.setValue(param.paramName);
        this.descriptionField.setValue(param.description); 
        this.tokenField.setValue(param.token); 
        this.varType.setValue(param.universalVarId);
        this.hasDefault.setValue(param.hasDefault);
      },
      addOptions: function () {
        var options = dojo.map(this.universalVars, function (uv) {
          return {
            label: uv.name,
            value: uv.id.toString()
          };
        });
        options.push({
          label: "Add another",
          value: "-1"
        });
        this.varType.addOption(options);
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
        dojo.style(this.popup.domNode, {
          top: "100px"
        });
      },
      hide: function () {
        this.popup.destroy();
      },
      submitForm: function (e) {
        dojo.stopEvent(e);
        if (this.form.validate()) {
          if (this.varType.getValue() === "-1") {
            this.saveUniversalVar().then(dojo.hitch(this, this.saveParam));//??
          } else {
            this.saveParam();
          }
        }
      },
      saveUniversalVar: function () {
        return qubit.qtag.data.dao.UniversalVarDAO.addUniversalVariable(
          this.universalNameField.getValue(),
          this.universalJsNameField.getValue(),
          this.universalDescriptionField.getValue()
        );
      },
      saveParam: function (universalVar) {
        var universalVarId, universalVarName;
        if (universalVar) {
          universalVarId = universalVar.id;
          universalVarName = universalVar.name;
        } else {
          universalVarId = this.varType.getValue();
          universalVarName = _.find(this.universalVars, function (uv) {
            return uv.id.toString() === universalVarId;
          }).name;
        }
        
        if (!this.param) {
          qubit.qtag.data.dao.ScriptTemplateDAO.addScriptParam(this.templateId,
              this.nameField.getValue(), this.descriptionField.getValue(), 
              this.tokenField.getValue(), universalVarId,
              this.hasDefault.checked)
            .then(dojo.hitch(this, this.saveComplete));
        } else {
          qubit.qtag.data.dao.ScriptTemplateDAO.saveScriptParam(this.templateId,
              this.param.id, this.nameField.getValue(), 
              this.descriptionField.getValue(), this.tokenField.getValue(), 
              universalVarId, this.hasDefault.checked)
            .then(function () {
              var param = this.getValue(universalVarId, universalVarName);
              this.saveComplete(param);
            }.bind(this));
          
        }
      },
      getValue: function (universalVarId, universalVarName) {
        return {
          id: this.param.id, 
          paramName: this.nameField.getValue(), 
          description: this.descriptionField.getValue(), 
          token: this.tokenField.getValue(), 
          universalVarId: universalVarId,
          valueName: universalVarName,
          hasDefault: this.hasDefault.checked
        };
      },
      saveComplete: function (param) {
        if (!this.param && param) {
          this.param = param;
        }
        if (this.param) {
          this.param.hasDefault = this.hasDefault.checked;
        }
        this.onSave(param);
        this.hide();
      },
      onSave: function () {
        
      }
    });
});
//= require <qubit/GLOBAL>

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.UniversalVariable", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Universal Variable",
      templateString: dojo.cache("qtag.templates", 
          "UniversalVariable.html?cb=" + qubit.v),
      postCreate: function () {
        qubit.Util.setText(this.valueName, this.variable.name);
        qubit.Util.setText(this.jsVariableName, this.variable.jsName);
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/data/Payment>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Button");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.PaymentSuccess", [dijit._Widget, dijit._Templated], {
    widgetsInTemplate: true,
    templateString: dojo.cache("qtag.templates", "PaymentSuccess.html?cb=" + 
        qubit.v),
    postCreate: function () {
      _gaq.push(['_trackPageview', '/PaymentSuccess']);
      dojo.connect(this.doneButton, "onClick", this, this.doClose);
    },
    doClose: function () {
      this.onClose();
    },
    onClose: function () {
      
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Textarea");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.RequestScript", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "RequestScript.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Request a Script"
        });
        this.inherited(arguments);
      },
      postCreate: function () {
        _gaq.push(['_trackPageview', '/RequestTemplatedScript']);
        this.inherited(arguments);
        dojo.connect(this.submitButton, "onClick", this, this.send);
      },
      send: function () {
        dojo.xhrPost({
          url: qubit.data.Urls.domain + qubit.data.Urls.user + 
            "/email/suggest",
          content: {
            suggestion: this.messageText.getValue()
          },
          handleAs: "json",
          load: dojo.hitch(this, this.hide),
          error: qubit.globalErrorHandler 
        });
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
      },
      hide: function () {
        this.popup.destroy();
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/ScriptChooser>
//= require <qubit/qtag/SVCreator>
//= require <qubit/qtag/data/dao/FilterDAO>
//= require <qubit/dojox/Dialog>


dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.Button");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CreateFilter", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Create Filter",
      templateString: dojo.cache("qtag.templates", "CreateFilter.html?cb=" + 
          qubit.v),
      onSave: function () {},
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Create Filter",
          onHide: dojo.hitch(this, function () {
            this.onHide();
          })
        });
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        dojo.connect(this.cancelButton, "onClick", this, this.hide);
        dojo.connect(this.form, "onSubmit", this, this.submitForm);
        dojo.connect(this.patternType, "onChange", 
          this, this.patternTypeSelected);
        dojo.connect(this.filterBasedOn, "onChange", 
            this, this.filterBasedOnSelected);
        dojo.connect(this.filterType, "onChange", 
            this, this.filterTypeChanged);
        if (this.filter) {
          this.setFilter();
          this.popup.set("title", "Edit Filter");
        }
      },
      filterTypeChanged: function () {
        if (this.sessionVariables) {
          this.sessionVariables.updateExcludeState(this.getFilterType() === 2);
        }
      },
      patternTypeSelected: function () {
        if (parseInt(this.patternType.getValue(), 10) === 1) {
          dojo.addClass(this.patternHolder, "hidden");
        } else {
          dojo.removeClass(this.patternHolder, "hidden");
        }
      },
      filterBasedOnSelected: function () {
        if (this.filterBasedOn.getValue() === "url") {
          dojo.addClass(this.noCookieWarning, "hidden");
          dojo.addClass(this.sessionVariableHolder, "hidden");
          dojo.removeClass(this.patternTypeHolder, "hidden");
          dojo.removeClass(this.patternHolder, "hidden");
          this.patternType.setValue("2");
          this.patternTypeSelected();
          this.sessionVariables.criticalJSErrors = false;
          if (this.sessionVariables.JSValidator) {
            this.sessionVariables.JSValidator.clear();
          }
        } else {
          if (+this.profile.maxCookieLength === 0) {
            dojo.removeClass(this.noCookieWarning, "hidden");
          }
          dojo.addClass(this.patternTypeHolder, "hidden");
          dojo.addClass(this.patternHolder, "hidden");
          dojo.removeClass(this.sessionVariableHolder, "hidden");
          this.createSVCreator();
        }
      },
      setFilter: function () {
        this.filterName.setValue(this.filter.name);
        this.filterType.setValue(this.filter.filterType);
        if (this.filter.patternType === 100) {
          this.filterBasedOn.setValue("session");
          this.createSVCreator(this.filter.pattern);
        } else {
          this.filterBasedOn.setValue("url");
          this.pattern.setValue(this.filter.pattern);
          this.patternType.setValue(this.filter.patternType);
        }
      },
      createSVCreator: function (descriptor) {
        if (!this.sessionVariables) {
          this.sessionVariables = new qubit.qtag.SVCreator({
            descriptor: descriptor,
            isExclude: this.getFilterType() === 2
          });
          this.sessionVariables.placeAt(this.sessionVariableHolder);
        }
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
        dojo.style(this.popup.domNode, {
          top: "100px"
        });
      },
      startup: function () {
        var deffer = dojo.hitch(this, function () {
          if (this.sessionVariables && this.sessionVariables.startup) {
            this.sessionVariables.startup();
          }
        });
        //We must deffer it as for some reason startup is 
        //NOT called synchronously and elements are out of DOM ! 
        //(its dojo thing)
        setTimeout(deffer, 10);
      },
      hide: function () {
        this.onHide();
        this.popup.destroy();
      },
      onHide: function () {
        if (this.sessionVariables) {
          this.sessionVariables.JSValidator.clear();
        }
      },
      submitForm: function (e) {
        dojo.stopEvent(e);
        if (this.sessionVariables && this.sessionVariables.criticalJSErrors) {
          qubit.DefaultNotificationsMgr.notify("script-save", 
            "<b>Please resolve errors in your scripts before saving!</b>");
          return;
        }
        if (this.form.validate()) {
          this.doneButton.set("disabled", true);
          
          if (this.validateForm()) {
            dojo.addClass(this.errorMessage, "hidden");
            if (this.filterBasedOn.getValue() === "url") {
              this.saveUrlFilter();
            } else {
              this.saveSessionFilter();
            }
            this.hide();
          } else {
            qubit.Util.setText(this.errorMessage,
              "Your session variables have not been fully filled in.");
            dojo.removeClass(this.errorMessage, "hidden");
            this.doneButton.set("disabled", false);
          }
        }
      },
      validateForm: function () {
        if (this.filterBasedOn.getValue() === "session") {
          return this.sessionVariables.validateForm();
        }
        return true;
      },
      saveUrlFilter: function () {
        var selectedPatternType, patternType, pattern, esc;
        selectedPatternType = parseInt(this.patternType.getValue(), 10);
        if (selectedPatternType >= 5) {
          esc = function (text) {
            return text.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
          };
          patternType = 3;
          pattern = this.pattern.getValue();
          if (selectedPatternType === 5) {
            pattern = "^" + esc(pattern);
          } else if (selectedPatternType === 6) {
            pattern = esc(pattern) + "$";
          }
        } else {
          patternType = selectedPatternType;
          pattern = this.pattern.getValue();
        }
        if (this.filter) {
          this.returnCurrentFilter(patternType, pattern);
        } else {
          this.returnNewFilter(patternType, pattern);
        }
      },
      saveSessionFilter: function () {
        var patternType, pattern;
        patternType = qubit.qtag.data.dao.FilterDAO.SESSION;
        pattern = this.sessionVariables.getValue();
        if (this.filter) {
          this.returnCurrentFilter(patternType, pattern);
        } else {
          this.returnNewFilter(patternType, pattern);
        }
      },
      returnCurrentFilter: function (patternType, pattern) {
        _gaq.push(['_trackPageview', '/FilterUpdate']);
        this.onSave(new qubit.qtag.data.model.Filter(
          this.filter.id, 
          this.filterName.getValue(),
          pattern,
          patternType,
          this.filter.priority,
          this.getFilterType()
        ));
      },
      returnNewFilter: function (patternType, pattern) {
        _gaq.push(['_trackPageview', '/FilterCreate']);
        this.onSave(new qubit.qtag.data.model.Filter(
          -1, //id
          this.filterName.getValue(),
          pattern,
          patternType,
          -1, //priority
          this.getFilterType()
        ));
      },
      getFilterType: function () {
        return parseInt(this.filterType.getValue(), 10);
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Textarea");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CodeShower", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "CodeShower.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Get Your Container Code",
          draggable: false
        });
        this.inherited(arguments);
      },
      doPostCreate: function () {
        _gaq.push(['_trackPageview', '/GetCDNCode']);
        this.inherited(arguments);
        this.fileName =  "<script src='" + 
          this.scriptName +
          "' async defer></script>";
        this.profileNameEdited();
        dojo.connect(this.cancelButton, "onClick", this, this.hide);
        dojo.connect(this.showEmailButton, "onClick", this, this.showEmail);
        dojo.connect(this.sendEmailButton, "onClick", this, this.emailDev);
        dojo.connect(this.scriptDisplay, "onClick", 
          this, this.profileNameEdited);
      },
      zeroClipTimeout: function () {
        this.zcTimeout = setTimeout(dojo.hitch(this, function () {
          this.clip.reposition();
          this.zeroClipTimeout();
        }));
      },
      startup: function () {
        setTimeout(dojo.hitch(this, function () {
          this.clip = new window.ZeroClipboard.Client();
          this.clip.setText(this.fileName);
          this.clip.glue(this.copyButton.domNode);
          this.zeroClipTimeout();
        }), 100);
      },
      profileNameEdited: function (e) {
        this.scriptDisplay.setValue(this.fileName);
        try {
          this.scriptDisplay.domNode.select();
        } catch (ex) {
          //this seems to break on ie9 sometimes.
        }
      },
      showEmail: function (e) {
        dojo.removeClass(this.cancelButtonPadding, "hidden");
        dojo.removeClass(this.emailDeveloperContainer, "hidden");
      },
      emailDev: function () {
        if (this.form.validate()) {
          qubit.qtag.data.dao.ProfileDAO.emailDev(this.form.getValues().email, 
            this.fileName).then(dojo.hitch(this, this.emailSent));
          this.sendEmailButton.set("disabled", true);
        }
      },
      emailSent: function () {
        this.sendEmailButton.set("disabled", false);
        this.status.success("Email sent");
      },
      show: function () {
        var init = function () {
            this.popup.attr("content", this.domNode);
            this.popup.show();
          }.bind(this),
          processForAWS;

        processForAWS = function (fname) {
          init();
          this.awsScriptName = fname;
          dojo.removeClass(this.scriptDisplayAWS, "hidden");
          this.scriptDisplayAWSInput.setValue(fname);
          this.doPostCreate();
        }.bind(this);
        
        qubit.qtag.data.dao.ProfileDAO.getFileLocation(
          this.profile.id,
          function (fname) {
            this.scriptName = fname;
            if (qubit.data.UserManager.client.paymentWhitelisted) {
              qubit.qtag.data.dao.ProfileDAO.getAWSFileLocation(
                this.profile.id,
                processForAWS
              );
            } else {
              init();
              this.doPostCreate();
            }
          }.bind(this)
        );
      },
      hide: function () {
        this.popup.destroy();
        clearTimeout(this.zcTimeout);
      }
    });
});
//= require <qubit/GLOBAL>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.SVRowCombiner", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: false,
      templateString: dojo.cache("qtag.templates", "SVRowCombiner.html?cb=" + 
          qubit.v),
      postCreate: function () {
        this.setType(this.opType);
      },
      setType: function (type) {
        if (type === "and") {
          dojo.removeClass(this.and, "hidden");
          dojo.addClass(this.or, "hidden");
        } else if (type === "or") {
          dojo.removeClass(this.or, "hidden");
          dojo.addClass(this.and, "hidden");
        } else {
          dojo.addClass(this.or, "hidden");
          dojo.addClass(this.and, "hidden");
        }
        this.opType = type;
      },
      getType: function () {
        return this.opType;
      },
      getJs: function () {
        var js;
        if (this.opType === "and") {
          js = "&&";
        } else if (this.opType === "or") {
          js = "||";
        } else {
          js = "";
        }
        return js;
      },
      getDescriptor: function () {
        return this.opType;
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/PaymentDecision>
//= require <qubit/qtag/PaymentForm>
//= require <qubit/qtag/PaymentSuccess>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.InlineEditBox");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Textarea");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.PaymentDialogue", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "PaymentDialogue.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({});
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        var decisionDialogue = new qubit.qtag.PaymentDecision({
          profiles: this.profiles
        });
        this.popup.set("title", 
          "You're now ready to host<br /> your tags loader! (why host?)");
        decisionDialogue.placeAt(this.decisionHolder);
        this.popup._position();
        dojo.connect(decisionDialogue, "onDoHost", this, this.doHost);
        dojo.connect(decisionDialogue, "onProfilesDownloaded", 
          this, this.profilesDownloaded);
      },
      doHost: function () {
        dojo.destroy(this.decisionHolder);
        var paymentForm = new qubit.qtag.PaymentForm(); 
        this.popup.set("title", 
          "Credit Card Registration");
        paymentForm.placeAt(this.paymentFormHolder);
        this.popup._position();
        dojo.connect(paymentForm, "onPaymentSuccess", this, 
          this.paymentSucceeded);
      },
      paymentSucceeded: function () {
        var paymentSuccess = this.showPaymentSuccess();
        dojo.connect(paymentSuccess, "onClose", this,
          this.paymentSuccessClosed);
      },
      showPaymentSuccess: function () {
        dojo.destroy(this.paymentFormHolder);
        var paymentSuccess = new qubit.qtag.PaymentSuccess({});
        this.popup.set("title", 
          "Credit Card Confirmation");
        paymentSuccess.placeAt(this.paymentSuccessHolder);
        this.popup._position();
        return paymentSuccess;
      },
      paymentSuccessClosed: function () {
        this.onPaymentSuccess();
        this.hide();
      },
      onPaymentSuccess: function () {
        
      },
      profilesDownloaded: function (profiles) {
        this.onProfilesAllDownloaded(profiles);
        this.hide();
      },
      onProfilesAllDownloaded: function (profiles) {
        
      },
      show: function () {
        if (!this.shown) {
          this.popup.attr("content", this.domNode);
          this.popup.show();
          this.shown = true;
        }
      },
      hide: function () {
        this.popup.destroy();
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/data/dao/CustomVarDAO>
//= require <qubit/JSValidator>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.Button");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CreateCustomVariable", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Create Custom Variable",
      templateString: dojo.cache("qtag.templates", 
          "CreateCustomVariable.html?cb=" + qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Create Custom " +
            (this.param ? this.param.paramName : "Variable")
        });
        dojo.addClass(this.popup.domNode, "CreateCustomVariablePopup");
        dojo.connect(this.popup, "hide", this, this.doHide);
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        dojo.connect(this.valueType, "onChange", 
            this, this.valueTypeSelected);
        dojo.connect(this.form, "onSubmit", this, this.submitForm);
        dojo.connect(this.cancel, "onClick", this, this.hide);
        this.addOptions();
        
        if (!this.isCustomScript && !this.isNewTemplatedValue) {
          dojo.addClass(this.nameHolder, "hidden");
        } else if (this.isNewTemplatedValue) {
          this.nameField.setValue(this.param.paramName);
        }
        
        this.valueTypeSelected();
        
        if (this.customVariable) {
          this.populate(this.customVariable);
        }
        if (this.hideButtons) {
          dojo.addClass(this.buttonsHolder, "hidden");
        }
        
        this.JSValidator = qubit.DefaultJSValidatorInstance;
        
        this.htmlSourceHolderPopupCheckboxInput.onclick = 
          dojo.hitch(this, function (e) {
            this.validationPopups = !this.validationPopups;
            this.checkFieldForErrors();
          });
        
        //comment out line below to bring back classical textareas
        this.applyFormattingForScriptEditor();
        
        this.JSValidator.clear();
      },
      /**
       * Function applying CodeMirror formatter to  
       * textarea node used for editing javascript code (js widget).
       * @see http://codemirror.net/doc/manual.html for details.
       */
      applyFormattingForScriptEditor: function () {
        var callback, 
          CodeMirror = window.CodeMirror,
          config = {
            lineNumbers: true,
            mode: "text/javascript"
          };
        
        this.jsCodeArea  = 
          CodeMirror.fromTextArea(this.js.domNode, config);
        
        //refreshing at real time DOM appearance is important
        this.js.startup = 
          dojo.hitch(this, this.refreshTextareaCMEditor);

        callback = dojo.hitch(this, this.textareaUpdater);
        
        dojo.connect(this.js, 
          "onChange", this, this.syncTextareaToCodeMirror);
        
        CodeMirror.on(this.jsCodeArea, "change", callback);
      },
      /**
       * CodeMirror editors need refreshing for each DOM resizing operation.
       * This is a function for Textareas editor object refreshing.
       */
      refreshTextareaCMEditor: function () {
        if (this.jsCodeArea) {
          this.jsCodeArea.refresh();
        }
      },
      /**
       * Handler for copying data from CodeMirror editor instance created by 
       * applyFormattingForScriptEditor to plain textarea of js object.
       * This is necessary synchronisation processing
       * for backwards compatibility.
       */
      textareaUpdater: function () {
        this.ignoreSyncToCodeMirror = true;
        this.js.setValue(this.jsCodeArea.getValue());
        this.checkFieldForErrors();
      },
      checkFieldForErrors: function () {
        var errors;
        if (this.jsCodeArea.getValue() !== "") {
          errors = this.JSValidator.validateScripts([
            "var x = {a: " + this.jsCodeArea.getValue() + "};"
          ], !this.validationPopups);
        }
        
        if (errors && errors.critical) {
          this.criticalErrors = true;
        } else {
          this.criticalErrors = false;
        }
        
        if (errors) {
          this.htmlSourceHolderNotification.innerHTML = 
            this.JSValidator.getFormattedMessage(errors);
        } else {
          this.criticalErrors = true;
          this.htmlSourceHolderNotification.innerHTML = 
            "<div class='msg'>No scripts detected.</div>";
        }
      },
      /**
       * Handler used to synchronise plain textarea (js object) 
       * with its CodeMirror instance editing field.
       */
      syncTextareaToCodeMirror: function () {
        if (!this.ignoreSyncToCodeMirror) {
          this.jsCodeArea.setValue(this.js.getValue());
        }
        this.ignoreSyncToCodeMirror = false;
      },
      /**
       * Function hiding jsCodeArea object from the view.
       */
      hideJsCodeArea: function () {
        if (this.jsCodeArea) {
          dojo.addClass(this.jsCodeArea.getWrapperElement(),
            "hidden");
        }
      },
      /**
       * Function unhiding jsCodeArea object from the view.
       */
      unhideJsCodeArea: function () {
        if (this.jsCodeArea) {
          dojo.removeClass(this.jsCodeArea.getWrapperElement(),
            "hidden");
        }
      },
      populate: function (customVariable) {
        this.nameField.setValue(customVariable.name);
        this.valueType.setValue(customVariable.typeId);
        if (this.valueType.getValue() === "2") {
          this.js.setValue(customVariable.value);
        } else {
          this.value.setValue(customVariable.value);
        }
      },
      addOptions: function () {
        var options = dojo.map(qubit.qtag.data.dao.CustomVarDAO.types, 
          function (t) {
            return {
              value: t.id,
              label: t.name
            };
          });
        this.valueType.addOption(options);
      },
      valueTypeSelected: function () {
        var label = "Value";
        this.criticalErrors = false;
        if (this.JSValidator) {
          this.JSValidator.clear();
          this.htmlSourceHolderNotification.innerHTML = "";
        }
        switch (this.valueType.getValue()) {
        case "2":
          label = "Javascript Expression";
          this.checkFieldForErrors();
          break;
        case "3":
          label = "Query Parameter";
          break;
        case "4":
          label = "Cookie Name";
          break;
        case "5":
          label = "Element Id";
          break;
        }
        qubit.Util.setText(this.labelText, label);
        if (this.valueType.getValue() === "2") {
          dojo.removeClass(this.js.domNode, "hidden");
          dojo.addClass(this.value.domNode, "hidden");
          dojo.removeClass(this.expressionHelp.domNode, "hidden");
          this.unhideJsCodeArea();
          this.refreshTextareaCMEditor();
        } else {
          dojo.addClass(this.js.domNode, "hidden");
          dojo.removeClass(this.value.domNode, "hidden");
          dojo.addClass(this.expressionHelp.domNode, "hidden");
          this.hideJsCodeArea();
        }
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
        dojo.style(this.popup.domNode, {
          top: "100px"
        });
        this.JSValidator.clear();
      },
      hide: function () {
        this.popup.destroy();
        this.doHide();
      },
      doHide: function () {
        this.JSValidator.clear();
        if (!this.saved) {
          this.onHide();
        }
      },
      onHide: function () {
      },
      submitForm: function (e) {
        dojo.stopEvent(e);
        
        if (this.criticalErrors) {
          qubit.DefaultNotificationsMgr.notify("script-save",
            "<b>Please resolve errors in your script before saving!</b>");
          return;
        }
        
        if (this.form.validate()) {
          if (!this.isCustomScript) {
            qubit.qtag.data.dao.CustomVarDAO.addCustomVariable(this.profileId, 
                this.getNiceName(), this.getCustomVarValue(), 
                this.valueType.getValue()).then(dojo.hitch(this, this.doSave));
          } else {
            this.doSave(this.getValue());
          }
        }
      },
      getValue: function () {
        return {
          name: this.nameField.getValue(),
          value: this.getCustomVarValue(),
          id: this.customVariable ? this.customVariable.id : -1,
          typeId: this.valueType.getValue()
        };
      },
      getCustomVarValue: function () {
        var value;
        if (this.valueType.getValue() === "2") {
          value = this.js.getValue();
        } else {
          value = this.value.getValue();
        }
        return value;
      },
      doSave: function (customVar) {
        this.saved = true;
        if (this.onSave) {
          this.onSave(customVar); 
        }
        this.hide();
      },
      getNiceName: function () {
        if (this.isNewTemplatedValue) {
          return this.nameField.getValue();
        } else if (this.param) {
          return "Custom " + this.param.paramName;
        } else {
          return "New Custom Variable";
        }
      } 
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/qtag/data/dao/ScriptDAO>
//= require <qubit/qtag/data/dao/StatsDAO>
//= require <qubit/qtag/CodeShower>
//= require <qubit/qtag/DependenciesExist>
//= require <qubit/qtag/MoveScripts>
//= require <qubit/qtag/MoveSingleScript>
//= require <qubit/qtag/ui/DisableABTestsPrompt>
//= require <qubit/qtag/ui/TagAccessorStringDialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojox.layout.ContentPane");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dojox.grid.DataGrid");
dojo.require("dijit.form.Button");
dojo.require("dijit.Menu");

dojo.addOnLoad(function () {
  var TagAccessorStringDialog = qubit.qtag.ui.TagAccessorStringDialog;
  var _fake_id_counter = 0;
  dojo.declare("qubit.qtag.ProfileViewer", [dijit._Widget, dijit._Templated], {
    widgetsInTemplate: true,
    templateString: dojo.cache("qtag.templates", "ProfileViewer.html?cb=" + 
        qubit.v),
    shown: false,
    loaded: false,
    postCreate: function () {
      var name = this.profile.name;
      qubit.Util.setText(this.profileName, name);
      
      var textUpdates = "";
      
      if (this.profile.hasNewVersion()) {
        textUpdates =
                "<span class='container-updates'>" +
                " (Updates Available)</span>";
      }
      
      var versions = this.profile.scriptsVersions;
      if (versions && versions.length > 0) {
        textUpdates = 
                "<span class='container-updates container-versions'>" +
                " (New Versions Available)</span>";
      }
      
      if (textUpdates) {
        this.profileName.innerHTML += textUpdates;
      }
      
      if (!this.profile.active) {
        qubit.Util.setText(this.profileInfo, " inactive");

        dojo.addClass(this.profileName, "inactive");
        dojo.addClass(this.profileInfo, "inactive");
      }
      dojo.connect(this.profileNameHolder, "onclick", this, this.toggleView);
      qubit.data.Permissions.setupButton(this.getCodeButton, this,
          this.showCode, "getClientFullDetails");
      qubit.data.Permissions.setupButton(this.addScriptButton, this, 
          this.createScript, "addScriptToFilterGroup");
      qubit.data.Permissions.setupButton(this.commitProfile, this, 
          this.commitProfileClicked, "saveProfile");
      qubit.data.Permissions.setupButton(this.revertProfile, this,
          this.doRevertProfile, "revertProfile");
      this.addMenu();
      this.checkPendingChanges();
     
      if (!this.profile.active) {
        qubit.qtag.Dashboard.hasInactiveProfiles = true;
      }
      this.toggleView();
      this.loaded = true; 
      if (this.isOpen) {
        this.toggleView();
      }
    },
    checkPendingChanges: function () {
      if (this.profileStateManager.isProfileUpdating(this.profile.id)) {
        dojo.addClass(this.containerNode.domNode, "pending");
        if (this.profile.needsSaving()) {
          if (this.profile.dirty) {
            qubit.Util.setText(this.commitState, 
              "This container has pending changes, what would you like to do?");
            dojo.addClass(this.pendingButtonHolder, "visible");
            dojo.removeClass(this.pendingButtonHolder, "updates");
          } else {
            qubit.Util.setText(this.commitState, 
              "This container has pending updates," +
                      " press `Commit` to update this tag now.");
            dojo.addClass(this.pendingButtonHolder, "visible");
            dojo.addClass(this.pendingButtonHolder, "updates");
          }
          
        } else {
          this.profileStateManager.updateProfileState(this.profile.id, 
            this.commitState);
          dojo.removeClass(this.pendingButtonHolder, "visible");
        }
        dojo.connect(this.profileStateManager, "onProfileCommitStarted", this, 
            this.profileCommitStarted);
        dojo.connect(this.profileStateManager, "onProfileCommitFinished", this, 
            this.profileCommitFinished);
        dojo.connect(this.profileStateManager, "onProfileRevertStarted", this, 
            this.profileRevertStarted);
        dojo.connect(this.profileStateManager, "onProfileRevertFinished", this, 
            this.profileRevertFinished);
        dojo.connect(this.profileStateManager, "onProfileSaveComplete", this, 
            this.profileSaveComplete);
        
      }
    },
    showPendingChanges: function () {
      if (this.profileStateManager.isProfileUpdating(this.profile.id)) {
        dojo.addClass(this.pendingChanges, "visible");
      }
    },
    commitProfileClicked: function () {
      this.doSave();
    },
    doSave: function (cb) {
      this.profileStateManager.verifyClientState([this.profile], 
        dojo.hitch(this, function () {
          this.profileStateManager.commitProfile(this.profile, 
            this.commitState);
          if (cb) {
            cb();
          }
        }));
    },
    profileCommitStarted: function (profile) {
      if (profile.id === this.profile.id) {
        this.hideButtons();
        this.preventEditing();
        qubit.Util.setText(this.commitState, "Saving");
      }
    },
    profileCommitFinished: function (profile, pushingToCdn, succeeded) {
      if (profile.id === this.profile.id) {
        if (pushingToCdn) {
          this.profileStateManager.updateProfileState(this.profile.id, 
              this.commitState);
        } else if (succeeded) {
          qubit.Util.setText(this.commitState, "Profile Committed");
          this.profileStateManager.removeListener(this.profile.id, 
            this.commitState);
          this.hidePendingChangesSoon();
        }
      }
    },
    doRevertProfile: function () {
      this.profileStateManager.revertProfile(this.profile.id);
    },
    profileRevertStarted: function (obj) {
      var profile = obj.profile;
      if (profile.id === this.profile.id) {
        this.hideButtons();
        this.preventEditing();
        qubit.Util.setText(this.commitState, "Reverting");
      }
    },
    profileRevertFinished: function (obj) {
      var profile = obj.profile;
      if (profile && profile.id === this.profile.id) {
        this.hideButtons();
        this.hidePendingChangesSoon();
        qubit.Util.setText(this.commitState, "Reverted");
      }
      this.updateProfiles();
    },
    profileSaveComplete: function (profile) {
      if (profile.id === this.profile.id) {
        this.hidePendingChangesSoon();
      }
    },
    preventEditing: function () {
      this.addScriptButton.set("disabled", true);
      this.preventEditingNow = true;
    },
    hideButtons: function () {
      dojo.removeClass(this.pendingButtonHolder, "visible");
    },
    hidePendingChangesSoon: function () {
      setTimeout(dojo.hitch(this, function () {
        //dojo.style(this.errorMessage, "display", "block");
        //dojo.removeClass(this.pendingChanges, "visible");
      }), 10 * 1000);
      dojo.removeClass(this.containerNode.domNode, "pending");
      dojo.fadeOut({
        node: this.pendingChanges,
        delay: 10 * 1000,
        duration: 500,
        onEnd: dojo.hitch(this, function () {
          dojo.removeClass(this.pendingChanges, "visible");
        })
      }).play();
    },
    showCode: function () {
      var d = new dojo.DeferredList([
        qubit.data.UserManager.getUser(),
        qubit.data.UserManager.getClientDetails()
      ]);
      d.then(dojo.hitch(this, this.doShowCode));
    },
    doShowCode: function (deferreds) {
      var widget, client, user;
      user = deferreds[0][1];
      client = qubit.data.UserManager.client;
      this.profileStateManager.verifyClientState([this.profile], 
          dojo.hitch(this, this.showCodeShower));
    },
    showCodeShower: function () {
      this.doShowCodeShower();
    },
    doShowCodeShower: function () {
      var widget = new qubit.qtag.CodeShower({
        profile: this.profile
      });
      widget.show();
    },
    addMenu: function () {
      var menu, button;
      menu = new dijit.Menu({
        style: "display: none;"
      });
      menu.addChild(new dijit.MenuItem({
        label: "Edit Container Options",
//        iconClass: "dijitIcon dijitIconEdit",
        onClick: dojo.hitch(this, this.changeName),
        disabled: !qubit.data.Permissions.isPermitted("alterProfile")
      }));
      menu.addChild(new dijit.MenuItem({
        label: "Add script",
//        iconClass: "dijitIcon dijitIconNewTask",
        onClick: dojo.hitch(this, this.createScript),
        disabled: !qubit.data.Permissions.isPermitted("addScriptToFilterGroup")
      }));
      menu.addChild(new dijit.MenuItem({
        label: "Duplicate",
//        iconClass: "dijitEditorIcon dijitEditorIconCopy",
        onClick: dojo.hitch(this, this.duplicateProfile),
        disabled: !qubit.data.Permissions.isPermitted("duplicateProfile")
      }));
      menu.addChild(new dijit.MenuItem({
        label: "Copy scripts to...",
//        iconClass: "dijitEditorIcon dijitEditorIconIndent",
        onClick: dojo.hitch(this, this.pushProfile),
        disabled: this.hideCopyToMenuItem || 
          (!(qubit.data.Permissions.isPermitted("addScriptToFilterGroup") &&
             qubit.data.Permissions.isPermitted("alterScript")))
      }));
      menu.addChild(new dijit.MenuItem({
        label: "Copy scripts from...",
//        iconClass: "dijitEditorIcon dijitEditorIconOutdent",
        onClick: dojo.hitch(this, this.pullProfile),
        disabled: this.hideCopyFromMenuItem ||
          (!(qubit.data.Permissions.isPermitted("addScriptToFilterGroup") &&
             qubit.data.Permissions.isPermitted("alterScript")))

      }));
      menu.addChild(new dijit.MenuItem({
        label: "Download raw script",
//        iconClass: "dijitEditorIcon dijitEditorIconCreateLink",
        onClick: dojo.hitch(this, this.downloadScript)
      }));
      
      if (this.profile.active) {
        menu.addChild(new dijit.MenuItem({
          label: "Deactivate",
//          iconClass: "dijitEditorIcon dijitEditorIconDelete",
          onClick: dojo.hitch(this, this.inactivateProfile),
          disabled: !qubit.data.Permissions.isPermitted("inactivateProfile")
        }));
      } else {
        menu.addChild(new dijit.MenuItem({
          label: "Activate",
//          iconClass: "dijitIcon dijitIconUndo",
          onClick: dojo.hitch(this, this.activateProfile),
          disabled: !qubit.data.Permissions.isPermitted("alterProfile")
        }));
      }
      menu.addChild(new dijit.MenuItem({
        label: "Page Variables",
        onClick: dojo.hitch(this, this.viewPageVariables)
      }));
      
      menu.addChild(new dijit.MenuItem({
        label: "Edit Consent Widget",
        onClick: dojo.hitch(this, this.editConsent)
      }));
      menu.addChild(new dijit.MenuItem({
        label: "View commit history",
        onClick: dojo.hitch(this, this.showSaveHistory)
      }));
      menu.addChild(new dijit.MenuItem({
        label: "Script Version: " + this.profile.version,
//        iconClass: "dijitIcon dijitIconUndo",
        disabled: true
      }));
  
      button = new dijit.form.DropDownButton({
        "class": "subtle small",
        label: "Configure",
        dropDown: menu
      });
      this.buttonHolder.appendChild(button.domNode);
    },
    editConsent: function () {
      var editConsent = new qubit.qtag.EditConsent({
        profile: this.profile
      });
      editConsent.show();
      dojo.connect(editConsent, "onHide", this, this.updateProfiles);
    },
    downloadScript: function () {
      _gaq.push(['_trackPageview', '/DownloadJS']);
      qubit.qtag.data.dao.ProfileDAO.getFreeLinkUrl(
        this.profile.id,
        function (url) {
          window.open(url);
        }
      );
    },
    inactivateProfile: function () {
      qubit.qtag.data.dao.ProfileDAO.inactivateProfile(this.profile.id, 
          this.updateProfiles);
    },
    activateProfile: function () {
      qubit.qtag.data.dao.ProfileDAO.activateProfile(this.profile.id, 
          this.updateProfiles);
    },
    viewPageVariables: function () {
      qubit.qtag.WindowManager.showPageVariables(this.profile);
    },
    isBodyOpen: function () {
      return !dojo.hasClass(this.body, "hidden");
    },
    toggleView: function () {
      this.doToggleView();
      if (!this.shown && this.loaded) {
        this.reloadScripts();
      }
    },
    reloadScripts: function () {
      if (!this.scriptsLoading) {
        this.scriptsLoading = true;
        if (this.grid) {
          dojo.destroy(this.grid.domNode);
        }
        qubit.qtag.data.dao.ScriptDAO.getScripts(
          this.profile.id,
          dojo.hitch(this, this.showScripts)
        );
      }
    },
    doToggleView: function () { // toggle profile display
      if (this.scriptsLoading) {
        return;
      }
      dojo.toggleClass(this.body, "hidden");
      if (dojo.hasClass(this.body, "hidden")) {
        qubit.Util.setText(this.expandoHolder, "+");
        dojo.removeClass(this.containerNode.domNode, "opened");
        dojo.addClass(this.containerNode.domNode, "closed");
      } else {
        _gaq.push(['_trackPageview', '/ViewContainerDetail']);
        qubit.Util.setText(this.expandoHolder, "-");
        dojo.removeClass(this.containerNode.domNode, "closed");
        dojo.addClass(this.containerNode.domNode, "opened");
      }
      this.onToggleStateChanged(this.profile, this.isBodyOpen());
    },
    onToggleStateChanged: function (profile, open) {
    },
    changeName: function () {
      var createProfile = new qubit.qtag.CreateProfile({
        updateProfiles: this.updateProfiles,
        profileToUpdate: this.profile
      });
      createProfile.show();
    },
    createScript: function (filterGroupId, scriptId) {
      if (!this.preventEditingNow) {
        if (filterGroupId && scriptId) {
          qubit.qtag.data.dao.ScriptDAO.getScript(this.profile.id, 
            filterGroupId, scriptId, dojo.hitch(this, this.doCreateScript));
        } else {
          this.doCreateScript();
        }
      }
    },
    doCreateScript: function (script) {
      qubit.qtag.WindowManager.addScript(this.profile, script);
    },
    duplicateProfile: function () {
      var createProfile = new qubit.qtag.CreateProfile({
        updateProfiles: this.updateProfiles,
        profileToDuplicate: this.profile
      });
      createProfile.show();
    },
    pushProfile: function () {
      var moveScripts = new qubit.qtag.MoveScripts({
        updateProfiles: this.updateProfiles,
        fromProfile: this.profile
      });
      moveScripts.show();
    },
    pullProfile: function () {
      var moveScripts = new qubit.qtag.MoveScripts({
        updateProfiles: this.updateProfiles,
        toProfile: this.profile
      });
      moveScripts.show();
    },
    showScripts: function (scripts) {
      var activeScripts = 0;
      
      scripts = this.removeConsentScripts(scripts);
      
      dojo.forEach(scripts, function (script) {
        if (script.active) {
          activeScripts += 1;
        }
      });
      
      if ((activeScripts === 0 && !this.showingInactive) || 
          (scripts.length === 0)) {
        dojo.addClass(this.emptyMessageHolder, "visible");
        // show pending changes even when no grid is rendered
        this.showPendingChanges();
        //however, hide the undo button, because there is nothing that can be
        //undone
        dojo.addClass(this.revertProfile.domNode, "hidden");
        this.scriptsLoading = false;
      } else {
        scripts.sort(function (a, b) {
          var aName, bName;
          aName = a.name.toLowerCase();
          bName = b.name.toLowerCase();
          return (aName > bName) ? 1 : ((aName === bName) ? 0 : -1);
        });
        var updates = this.profile.scriptsToUpdate;
        var versions = this.profile.scriptsVersions;
        dojo.forEach(scripts, function (script, i) {
          if (script.averageLoadingTime < 0) {
            script.averageLoadingTime = "...";
          }
          if (updates) {
            for (var c = 0; c < updates.length; c++) {
              if (updates[c] === script.masterId) {
                script.versionUpdated = true;
              }
            }
          }
          if (versions) {
            for (var j = 0; j < versions.length; j++) {
              if (versions[j][0] === script.masterId) {
                //this is necessary to fool dojo validator
                script.newScriptVersion = {
                  id: "__fake_id__" + (_fake_id_counter++), 
                  name: versions[j][1].name,
                  version: versions[j][1].version
                };
              }
            }
          }
        });
        dojo.removeClass(this.emptyMessageHolder, "visible");
        this.optionButtonHolderIds = [];
        this.createGrid(scripts, this.scriptsHolder);
        this.getStats(scripts);
      }
    },
    removeConsentScripts: function (scripts) {
      var index = -1;
      dojo.forEach(scripts, function (script, i) {
        if (script.name === "QuBit Consent") {
          index = i;
          return false;
        }
      });
      if (index >= 0) {
        scripts.splice(index, 1);
      }
      return scripts;
    },
    getStats: function (scripts) {
      var start, end;
      end = new Date();
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      this.statsLoadedCount = 0;
      dojo.forEach(scripts, dojo.hitch(this, function (script, i) {
        qubit.qtag.data.dao.StatsDAO.getScriptStats(this.profile.id, 
          script.masterId, start, end, qubit.qtag.data.dao.StatsDAO.all, 
          dojo.hitch(this, dojo.partial(this.scriptStatsLoaded, i, scripts)));
      }));
    },
    scriptStatsLoaded: function (i, scripts, stats) {
      scripts[i] = this.scripts[scripts[i].id[0] || scripts[i].id];
      scripts[i].averageLoadingTime = this.formatStat(stats[0].avgLoadingTime);
      scripts[i].timesServed = stats[0].timesServed;
      this.statsLoadedCount += 1;
      if (this.statsLoadedCount === scripts.length) {
        this.allStatsLoaded(scripts);
      }
    },
    formatStat: function (s) {
      var str = s.toString(), i = str.indexOf(".");
      if ((i > 0) && (str.length > i + 2)) {
        str = str.substring(0, i + 2);
      }
      return str;
    },
    allStatsLoaded: function (scripts) {
      dojo.forEach(scripts, function (script, i) {
        if (script.averageLoadingTime < 0) {
          script.averageLoadingTime = 1;
        }
      });
      if (this.grid) {
        dojo.destroy(this.grid.domNode);
      }
      this.createGrid(scripts, this.scriptsHolder);
      this.shown = true;
      this.scriptsLoading = false;
    },
    createGrid: function (scripts, holder) {
      var store, createYesNoField, layout, grid, source, formatDate, 
        createNameField, removePadding;
      formatDate = function (inDatum) {
        return dojo.date.locale.format(inDatum, this.constraint);
      };
      createYesNoField = function (yesNoString) {
        return "<span class='" + yesNoString + "'>" + yesNoString + "</span>";
      };
      createNameField = function (id) {
        var text, script, length, menu, button, qnMark;
        script = _.clone(this.scripts[id]);
        text = script.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        var scriptName = text;
        var appendText = "";
        var message;
        var updates = false;
        var versionsToUpdate = false;
        var tooltip;
        
        if (this.scripts[id].versionUpdated) {
          updates = true;
        }
        
        var versionString;
        var templateName;
        
        if (this.scripts[id].newScriptVersion) {
          versionsToUpdate = true;
          // CAUTION: weird DOJO bug, converting all props to an array!!!
          // DOJO is scheduled to be deleted.
          versionString = this.scripts[id].newScriptVersion.version;
          versionString = ("" + versionString).replace(/\._(\d)/g, ".$1");
          templateName = this.scripts[id].newScriptVersion.name;
          
        }
        
        if (script.locked) {
          appendText += '&nbsp;&nbsp;<span class="ab-test-icon">' +
            'A/B Test<i class="fa fa-bar-chart"></i>' +
            '</span>';
        }
        
        if (updates || versionsToUpdate) {
          var output = "";
          if (updates && !versionsToUpdate) {
            output = "Updates available";
            message = "The vendor has updated this tag. When you commit, your " +
              "container will automatically <br/>update your tag to  " +
              "the new version.";
          } else if (!updates && versionsToUpdate) {
            output = "Updated Tag Available";
            message = "There is a new major version of this tag available" +
                  " and can be found in the tag library <br/>under " +
                  "\"" + templateName + " (" +
                  versionString +
                  ")\".<br/>Please archive tag " + scriptName +
                  " and use the new version.";
          } else if (updates && versionsToUpdate) {
            output = "Updates and Updated Tag Available available";
            message = "The vendor has updated this tag (when you commit, your " +
              "container will automatically <br/>update your tag to  " +
              "the new version).<br/>" +
              "There is also a new major version of this tag available" +
                  " and can be found in the tag library <br/>under " +
                  "\"" + templateName + " (" +
                  versionString +
                  ")\".<br/>Please archive tag " + scriptName +
                  " and use the new version or click commit to update tag.";
          }
          
          tooltip = "<div class='tip version default-shadows'>" +
                  message + "</div>";
          appendText = "<span class='container-updates'> (" +
                output +
                tooltip + ") </span>";
        }
        
        length = script.parentDependencies.length;
        if (length > 0) {
          if (text.length > 40) {
            text = text.substring(0, 40) + "...";
          }
          text += appendText;
          text += " - <span class='depsHolder'>" +
            length.toString() +
            " dependenc" + (length === 1 ? "y" : "ies") + "</span>";
          menu = new dijit.Menu({
            style: "display: none;"
          });
          dojo.forEach(script.parentDependencies,
            dojo.hitch(this, function (id) {
              menu.addChild(new dijit.MenuItem({
                label: this.scripts[id].name
              }));
            }));
          button = new dijit.form.DropDownButton({
            label: text,
            "class": "subtle small empty nameField " + 
              (length > 0 ? "" : "hideButton"),
            dropDown: menu
          });
          qnMark = dojo.query(".depsHolder", button.domNode)[0];
          dojo.connect(qnMark, "onmouseover", this, function (e) {
            button.loadDropDown();
            dojo.addClass(button.dropDown._popupWrapper, "dependencyListPopup");
            dojo.style(button.dropDown.domNode, "width", "200px");
          });
          dojo.connect(qnMark, "onmouseout", this, function () {
            button.closeDropDown();
          });
          return button;
        } else {
          text += appendText;
        }
        
        //adding block wrapper to text
        return "<div class='wrapper'>" + text + "</div>";
      };
      this.scripts = {};
      dojo.forEach(scripts, dojo.hitch(this, function (script) {
        this.scripts[script.id] = _.clone(script);
      }));
      dojo.forEach(scripts, function (s) {
        if (s.active === true) {
          s.activeLabel =  "yes";
        } else if (s.active === false) {
          s.activeLabel = "no";
        }
        if (s.async) {
          s.asyncLabel =  "yes";
        } else if (s.async === false) {
          s.asyncLabel = "no";
        }
      });
      if (!this.showingInactive) {
        scripts = dojo.filter(scripts, function (script) {
          return script.active;
        });
      }
      store = new dojo.data.ItemFileReadStore({
        data: {
          identifier: 'id',
          label: 'name',
          items: scripts
        }
      });

      removePadding = dojo.isIE || dojo.isChrome >= 19;
      layout = [
        {
          field: 'id',
          name: '&nbsp;&nbsp;Name',
          width: '376px',
          formatter: dojo.hitch(this, createNameField),
          classes: "createNameField"
        },
        {
          field: 'activeLabel',
          name: 'Active',
          width: '62px',
          formatter: dojo.hitch(this, createYesNoField),
          classes: "center activeLabel"
//          cellType: dojox.grid.cells.Bool,
//          editable: true
        },
//        {
//          field: 'timesServed',
//          name: 'Times Served',
//          width: '100px'
//        },
        {
          field: 'asyncLabel',
          name: 'Async',
          width: '60px',
          formatter: dojo.hitch(this, createYesNoField),
          classes: "center asyncLabel"
        },
        {
          field: 'averageLoadingTime',
          name: 'Avg Load Time',
          width: '128px',
          classes: "center averageLoadingTime"
        },
//        {
//          field: 'startDate',
//          name: 'Start Date',
//          formatter: formatDate,
//          constraint: {selector: "date"},
//          width: '100px'
//        },
//        {
//          field: 'endDate',
//          name: 'End Date',
//          formatter: formatDate, 
//          constraint: {selector: "date"},
//          width: '100px'
//        },
        {
          name: " ",
          field: "id",
          width: '99px',
          formatter: dojo.hitch(this, this.createOptionsButton),
          classes: "center createOptionsButton"
        }
      ];
      grid = new dojox.grid.DataGrid(
        {
          query: {
            id: '*'
          },
          autoHeight: true,
          rowHeight: 35,
          autoWidth: true,
          store: store,
          clientSort: true,
          //rowSelector: 0,
          structure: layout
        }, 
        document.createElement('div')
      );
      holder.appendChild(grid.domNode);
      grid.onFetchError = function (e) {
        console.debug(e);
      };
      dojo.connect(grid, "onStyleRow", this, function (row) {
        var item, active;
        item = grid.getItem(row.index);
        if (item) {
          active = grid.store.getValue(item, "active", null);
          if (!active || (active === "no")) {
            dojo.addClass(row.node.childNodes[0], "inactive");
          }
        }
      });
      /*dojo.connect(grid, "onRowClick", this, function (e) {
        this.lastRow = this.grid.getRowNode(e.rowIndex);
      });*/
     
      dojo.connect(grid, "onCellMouseOver", this, function (e, x) {
        grid.focus.setFocusCell(e.cell, e.rowIndex);
//        this.lastRow = this.grid.getRowNode(e.rowIndex);
      });
      this.optionButtonHolderIds = [];
      grid.startup();
      this.grid = grid;
      //show pending changes only when the grid is rendered
      this.showPendingChanges();
    },
    createOptionsButton: function (id) {
      var menu, button, script;
      script = _.clone(this.scripts[id]);
      menu = new dijit.Menu({
        style: "display: none;"
      });
      menu.addChild(new dijit.MenuItem({
        label: "Edit",
//        iconClass: "dijitIcon dijitIconEdit",
        onClick: dojo.hitch(this, dojo.partial(this.createScript, 
            script.filterGroupId, script.id)),
        disabled: !qubit.data.Permissions.isPermitted("alterScript")
      }));
      
      if (script.active) {
        menu.addChild(new dijit.MenuItem({
          label: "Deactivate",
//          iconClass: "dijitIcon dijitIconDelete",
          onClick: dojo.hitch(this,
              dojo.partial(this.inactivateScript, script)),
          disabled: !qubit.data.Permissions.isPermitted("inactivateScript")
        }));
      } else {
        menu.addChild(new dijit.MenuItem({
          label: "Activate",
//          iconClass: "dijitIcon dijitIconUndo",
          onClick: dojo.hitch(this, dojo.partial(this.activateScript, script)),
          disabled: !qubit.data.Permissions.isPermitted("alterScript")
        }));
      }
      menu.addChild(new dijit.MenuItem({
        label: "Copy To",
//        iconClass: "dijitEditorIcon dijitEditorIconIndent",
        onClick: dojo.hitch(this, dojo.partial(this.copyScript, script)),
        disabled: this.hideCopyToMenuItem ||
          !qubit.data.Permissions.isPermitted("addScriptToFilterGroup")
      }));
      
      if (qubit.data.UserManager.client.paymentWhitelisted) {
        if (script.locked) {
          menu.addChild(new dijit.MenuItem({
            label: "Disable A/B test in Deliver",
            onClick: function () {
              var promp = new qubit.qtag.ui.DisableABTestsPrompt({
                tagName: script.name,
                disableAction: function () {
                  this.setABTestsLock(script, false);
                }.bind(this),
                cancelAction: function () {
                }.bind(this)
              });
              promp.paint();
            }.bind(this)
          }));
        } else {
          menu.addChild(new dijit.MenuItem({
            label: "Enable A/B test in Deliver",
            onClick:  function () {
              var callback = function () {
                var name = script.name;
                var masterId = script.masterId;
                var popup = new TagAccessorStringDialog({
                  tagMasterId: masterId,
                  tagName: name
                });
                popup.paint();
                popup.show();
              };
              this.setABTestsLock(script, true, callback);
            }.bind(this)
          }));
        }
      }
      
      button = new dijit.form.DropDownButton({
        label: "",
        "class": "subtle small empty",
        dropDown: menu,
        iconClass: "icon-14px-cog icon"
      });/*
      setTimeout(dojo.hitch(this, function () {
        dojo.connect(button, "openDropDown", this, function () {
          console.debug(this.lastRow);
          dojo.addClass(this.lastRow, "dojoxGridRowOver");
          dojo.connect(button.dropDown, "onMouseMove", this, function () {
            dojo.addClass(this.lastRow, "dojoxGridRowOver");
          });
          
        });
        dojo.connect(button, "closeDropDown", this, function () {
          console.debug(this.lastRow);
          dojo.addClass(this.lastRow, "dojoxGridRowOver");
        });
      }));
      */
      return button;
    },
    copyScript: function (script) {
      var moveScripts = new qubit.qtag.MoveSingleScript({
        updateProfiles: this.updateProfiles,
        profile: this.profile,
        script: script,
        scripts: this.scripts
      });
      moveScripts.show();
    },
    activateScript: function (script) {
      qubit.qtag.data.dao.ScriptDAO.activateScript(this.profile.id, 
        script.filterGroupId, script.id, dojo.hitch(this, this.updateConsent));
    },
    setABTestsLock: function (script, enable, callback) {
      var caller = function () {
        this.updateConsent();
        if (callback) {
          callback();
        }
      }.bind(this);
      qubit.qtag.data.dao.ScriptDAO.setABTestsLock(this.profile.id, 
            script.filterGroupId, script.id, enable, caller);
    },
    inactivateScript: function (script) {
      if (script.childDependencies.length === 0) {
        qubit.qtag.data.dao.ScriptDAO.inactivateScript(this.profile.id, 
            script.filterGroupId, script.id, 
            dojo.hitch(this, this.updateConsent));
      } else {
        new qubit.qtag.DependenciesExist({
          script: script,
          scripts: this.scripts
        }).show();
      }
    },
    updateConsent: function () {
      qubit.qtag.data.dao.ScriptDAO.getScripts(this.profile.id,
        dojo.hitch(this, dojo.partial(this._updateConsent)));
    },
    _updateConsent: function (scripts) {
      var hasActiveConsent, consentScript;
      hasActiveConsent = _.select(scripts, function (script) {
        return (script.needsConsent === true) && script.active;
      });
      consentScript = _.find(scripts, function (script) {
        return script.name ===
          qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptName;
      });
      if (consentScript) {
        if (hasActiveConsent.length) {
          qubit.qtag.data.dao.ScriptDAO.activateScript(
            this.profile.id,
            consentScript.filterGroupId,
            consentScript.id,
            dojo.hitch(this, this.updateProfiles)
          );
        } else {
          qubit.qtag.data.dao.ScriptDAO.inactivateScript(
            this.profile.id,
            consentScript.filterGroupId,
            consentScript.id,
            dojo.hitch(this, this.updateProfiles)
          );
        }
      }
    },
    showSaveHistory: function () {
      qubit.qtag.WindowManager.showSaveHistory(this.profile);
    }
  });
  qubit.qtag.ProfileViewer.rowButtonId = 0;
});
//= require <qubit/GLOBAL>
//= require <qubit/dojox/Dialog>
//= require <qubit/util/Status>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.VerifyEmail", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "VerifyEmail.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Verify Your Email"
        });
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        dojo.connect(this.resend, "onClick", this, this.resendEmail);
      },
      resendEmail: function () {
        this.resend.set("disabled", true);
        qubit.data.UserManager.resendEmail(dojo.hitch(this, this.emailResent));
      },
      emailResent: function () {
        this.status.success("Email sent!"); 
      },
      show: function () {
        if (!this.shown) {
          this.popup.attr("content", this.domNode);
          this.popup.show();
          this.shown = true;
        }
      },
      hide: function () {
        this.popup.destroy();
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.InlineEditBox");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Textarea");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CreateProfile", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "CreateProfile.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({});
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        var heading = "Create Container";
        if (this.profileToDuplicate) {
          heading = "Duplicate Container";
          this.zipped.set("disabled", true);
          this.delayDocWrite.set("disabled", true);
          this.maxCookieLength.set("disabled", true);
        } else if (this.profileToUpdate) {
          heading = "Change Name";
          this.createProfileButton.set("label", "Save");
        }
        this.popup.set("title", heading);
        dojo.connect(this.form, "onSubmit", this, this.submitForm);
        
        if (this.profileToDuplicate) {
          this.zipped.setValue(this.profileToDuplicate.zipped);
        } else if (this.profileToUpdate) {
          this.zipped.setValue(this.profileToUpdate.zipped);
          this.delayDocWrite.setValue(this.profileToUpdate.delayDocWrite);
          this.profileName.setValue(this.profileToUpdate.name);
          this.cookieDomain.setValue(this.profileToUpdate.cookieDomain);
          this.maxCookieLength.setValue(this.profileToUpdate.maxCookieLength);
        } else {
          this.zipped.setValue(true);
          dojo.addClass(this.cookieDomainRow, "hidden");
          dojo.addClass(this.maxCookieLengthRow, "hidden");
          dojo.addClass(this.noCookieRow, "hidden");
          dojo.addClass(this.delayDocWriteRow, "hidden");
          this.maxCookieLength.setValue(1000);
        }
        
        if (this.profileToUpdate && 
                +this.profileToUpdate.maxCookieLength === 0) {
          this.maxCookieLength.attr('constraints').min = 0;
          this.maxCookieLength.focusNode.disabled = true;
          this.maxCookieLength.validate();
          this.noCookie.setChecked(true);
        }
        
        dojo.connect(this.noCookie, "onClick", function () {
          if (this.noCookie.getValue() !== false) {
            this._oldValue = this.maxCookieLength.getValue();
            this.maxCookieLength.attr('constraints').min = 0;
            this.maxCookieLength.setValue(0);
            this.maxCookieLength.focusNode.disabled = true;
          } else {
            this.maxCookieLength.attr('constraints').min = 200;
            if (this._oldValue) {
              this.maxCookieLength.setValue(this._oldValue);
            } else {
              this.maxCookieLength.setValue(1000);
            }
            this.maxCookieLength.focusNode.disabled = false;
          }
        }.bind(this));
      },
      submitForm: function (e) {
        this.createProfileButton.set("disabled", true);
        if (this.form.validate()) {
          this.createProfile();
        } else {
          this.createProfileButton.set("disabled", false);
        }
        dojo.stopEvent(e);
      },
      createProfile: function () {
        var values = this.form.getValues();
        if (this.profileToDuplicate) {
          _gaq.push(['_trackPageview', '/ContainerDuplicate']);
          qubit.qtag.data.dao.ProfileDAO.duplicateProfile(
            this.profileToDuplicate.id,
            values.profileName,
            dojo.hitch(this, this.profileCreated)
          );
        } else if (this.profileToUpdate) {
          _gaq.push(['_trackPageview', '/ContainerEdit']);
          qubit.qtag.data.dao.ProfileDAO.alterProfile(
            this.profileToUpdate.id,
            values.profileName,
            values.cookieDomain,
            this.zipped.getValue() !== false,
            this.zipped.getValue() === false,
            this.delayDocWrite.getValue() !== false,
            this.delayDocWrite.getValue() === false, 
            false, 
            false,
            this.maxCookieLength.getValue(),
            dojo.hitch(this, this.profileAltered)
          );
        } else {
          _gaq.push(['_trackPageview', '/ContainerCreate']);
          qubit.qtag.data.dao.ProfileDAO.createProfile(values.profileName,
            this.cookieDomain.getValue(), 
            this.zipped.getValue() !== false, 
            this.delayDocWrite.getValue() !== false, 
            dojo.hitch(this, this.profileCreated));
        }
      },
      profileAltered: function () {
        qubit.qtag.data.dao.ConsentDAO.findOrCreateConsentScript(
          this.profileToUpdate.id,
          dojo.hitch(this, this.consentConfigReceived)
        );
      },
      consentConfigReceived: function (consentScript, config) {
        config.cookieDomain = this.cookieDomain.getValue();
        qubit.qtag.data.dao.ConsentDAO.saveConsent(this.profileToUpdate.id, 
          consentScript, config, dojo.hitch(this, this.profileCreated));
      },
      profileCreated: function () {
        this.updateProfiles();
        this.hide();
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
      },
      hide: function () {
        this.popup.destroy();
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/data/UserManager>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Button");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CommitCheck", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Committing to CDN",
      templateString: dojo.cache("qtag.templates", "CommitCheck.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
        });
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        dojo.connect(this.form, "onSubmit", this, this.submitForm);
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
        dojo.style(this.popup.domNode, {
          position: "absolute",
          top: "100px"
        });
      },
      hide: function () {
        this.popup.destroy();
      },
      submitForm: function (e) {
        dojo.stopEvent(e);
//        qubit.data.UserManager.checkPassword(this.password.getValue())
//          .then(dojo.hitch(this, this.passwordOk));
        this.passwordOk(this.password.getValue() === "COMMIT");
      },
      passwordOk: function (ok) {
        if (ok === true) {
          this.onSave();
          this.hide();
        } else {
          dojo.removeClass(this.errorMessage, "hidden");
          setTimeout(dojo.hitch(this, function () {
            dojo.addClass(this.errorMessage, "hidden");
          }), 7000);
        }
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/CreateCustomVariable>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CustomVariable", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Custom Variable",
      templateString: dojo.cache("qtag.templates", "CustomVariable.html?cb=" + 
          qubit.v),
      postCreate: function () {
        qubit.Util.setText(this.valueName, this.variable.name);
        if (this.variable.usageCount > 0) {
          dojo.addClass(this.deleteButton.domNode, "hidden");
          qubit.Util.setText(this.useHolder,  
            "(" + this.variable.usageCount + " use" + 
            (this.variable.usageCount > 1 ? "s" : "") + ")");
        } else {
          qubit.Util.setText(this.useHolder, "(Not Used)");
          dojo.connect(this.deleteButton, "onClick", this, this.doDelete);
        }
        qubit.Util.setText(this.typeName, this.getType(this.variable.typeId));
        dojo.connect(this.editButton, "onClick", this, this.onEdit);
      },
      doDelete: function () {
        qubit.qtag.data.dao.CustomVarDAO.deleteCustomVariable(this.profileId, 
          this.variable.id).then(dojo.hitch(this, this.deleteComplete));
      },
      deleteComplete: function () {
        dojo.destroy(this.domNode);
      },
      onEdit: function () {
        new qubit.qtag.CreateCustomVariable({
          customVariable: this.variable,
          isCustomScript: true,
          onSave: dojo.hitch(this, this.doSave)
        }).show();
      },
      doSave: function (cv) {
        qubit.qtag.data.dao.CustomVarDAO.saveCustomVariable(this.profileId, 
            cv.id, cv.name, cv.value, cv.typeId).then(this.onSave);
      },
      onSave: function () {
      },
      getType: function (typeId) {
        return qubit.qtag.data.dao.CustomVarDAO.typesById[typeId];  
      }
    });
});
//= require <qubit/GLOBAL>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.TemplateDetailView", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", 
        "TemplateDetailView.html?cb=" + qubit.v),
      postCreate: function () {
        this.inherited(arguments);
        
        if (this.template.html) {
          this.htmlHolder.innerHTML = this.parameterise(this.template.html);
          dojo.addClass(this.urlHolderHolder, "hidden");
          dojo.addClass(this.preHolderHolder, "hidden");
          dojo.addClass(this.postHolderHolder, "hidden");
        } else {
          if (this.template.pre) {
            this.preHolder.innerHTML = 
              this.parameterise(this.beautify(this.template.pre));
          } else {
            dojo.addClass(this.preHolderHolder, "hidden");
          }
          if (this.template.post) {
            this.postHolder.innerHTML = 
              this.parameterise(this.beautify(this.template.post));
          } else {
            dojo.addClass(this.postHolderHolder, "hidden");
          }
          if (this.template.url) {
            this.urlHolder.innerHTML = this.parameterise(this.template.url);
          } else {
            dojo.addClass(this.urlHolderHolder, "hidden");
          }
          dojo.addClass(this.htmlHolderHolder, "hidden");
        }
        
        if (this.template.script) {
          this.scriptHolder.innerHTML = 
            this.parameterise(this.beautify(this.template.script.toString()));
        } else {
          dojo.addClass(this.scriptHolderHolder, "hidden");
        }
      },
      beautify: function (value) {
        try {
          var newValue = value.replace(/\s+/, "");
          return window.js_beautify(newValue, {
            indent_char: '  ',
            indent_size: 1
          });
        } catch (ex) {
          return value;
        }
      },
      parameterise: function (value) {
        value = value.replace(/\&/g, "&amp;");
        value = value.replace(/>/g, "&gt;");
        value = value.replace(/</g, "&lt;");
        value = value.replace(/\"/g, "&quot;");
        value = value.replace(/\n/g, "<br/>");
        //plain old type
        dojo.forEach(this.template.scriptParams, function (param, i) {
          value = value.replace(new RegExp("\\${" + param.token + "}", "g"), 
            "<span class='bgcolor bgcolor" + ((i % 14) + 1) + "'>" +
            param.paramName +
            "</span>");
        });

        dojo.forEach(this.template.scriptParams, function (param, i) {
          //'' + typos
          value = value.replace(
                  new RegExp("'' \\+ _this\\.valueForToken\\(\\&quot;" +
                          param.token + "\\&quot;\\)", "g"),
                  "<span class='bgcolor bgcolor" + ((i % 14) + 1) + "'>" +
                  param.paramName +
                  "</span>");

          value = value.replace(
                  new RegExp("'' \\+ this\\.valueForToken\\(\\&quot;" +
                          param.token + "\\&quot;\\)", "g"),
                  "<span class='bgcolor bgcolor" + ((i % 14) + 1) + "'>" +
                  param.paramName +
                  "</span>");
          //" typos
          value = value.replace(
                  new RegExp("_this\\.valueForToken\\(\\&quot;" +
                          param.token + "\\&quot;\\)", "g"),
                  "<span class='bgcolor bgcolor" + ((i % 14) + 1) + "'>" +
                  param.paramName +
                  "</span>");

          value = value.replace(
                  new RegExp("this\\.valueForToken\\(\\&quot;" +
                          param.token + "\\&quot;\\)", "g"),
                  "<span class='bgcolor bgcolor" + ((i % 14) + 1) + "'>" +
                  param.paramName +
                  "</span>");
          //' typos
          value = value.replace(
                  new RegExp("_this\\.valueForToken\\('" +
                          param.token + "'\\)", "g"),
                  "<span class='bgcolor bgcolor" + ((i % 14) + 1) + "'>" +
                  param.paramName +
                  "</span>");

          value = value.replace(
                  new RegExp("this\\.valueForToken\\('" +
                          param.token + "'\\)", "g"),
                  "<span class='bgcolor bgcolor" + ((i % 14) + 1) + "'>" +
                  param.paramName +
                  "</span>");
        });

        return value;
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/ScriptIcon>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.ScriptChooser", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Add Script",
      templateString: dojo.cache("qtag.templates", "ScriptChooser.html?cb=" + 
          qubit.v),
      postCreate: function () {
        this.inherited(arguments);
        qubit.qtag.data.dao.VendorDAO.getVendors(dojo.hitch(this, 
          this.saveVendors));
      },
      saveVendors: function (vendors) {
        this.vendorMap = {};
        dojo.forEach(vendors, dojo.hitch(this, function (vendor) {
          this.vendorMap[vendor.id] = vendor;
        }));
        this.showVendors();
      },
      setTemplates: function (scripts) {
        this.scripts = scripts;
        if (scripts.length > 0) {
          this.showVendors();
          dojo.removeClass(this.vendorHolder, "empty");
          dojo.removeClass(this.chooserHolder, "hidden");
        } else {
          this.vendorHolder.innerHTML = 
            "No vendors publicly available for this category at this moment..";
          dojo.addClass(this.vendorHolder, "empty");
          dojo.addClass(this.chooserHolder, "hidden");
          this.clearOldRows();
        }
      },
      showVendors: function () {
        if (!this.scripts || !this.vendorMap) {
          return;
        }
        var divs, fn, vendorIds = this.getVendorIds(this.scripts);
        this.vendorHolder.innerHTML = "";
        divs = [];
        vendorIds.sort(dojo.hitch(this, function (a, b) {
          try {
            var aName, bName;
            aName = this.vendorMap[a].name;
            bName = this.vendorMap[b].name;
            return bName > aName ? -1 : (bName === aName ? 0 : 1);
          } catch (ex) {
            //vendor does not exists!
            return 0;
          }
        }));
        dojo.map(vendorIds, dojo.hitch(this, function (vendorId, i) {
          var vendor, div;
          vendor = this.vendorMap[vendorId];
          div = dojo.create("div", {
            innerHTML: vendor.name + "<span class='vendor-arrow'></span>",
            className: "vendor"
          });
          if (dojo.isIE) {
            dojo.addClass(div, "small");
          }
          fn = dojo.partial(this.vendorSelected, vendor, div, divs, 
              this.scripts);
          dojo.connect(div, "onclick", this, fn);
          if (i === 0) {
            dojo.hitch(this, fn)();
          }
          divs.push(div);
          this.vendorHolder.appendChild(div);
        }));
      },

      vendorSelected: function (vendor, div, divs, allScripts) {
        if (dojo.hasClass(div, "selected")) {
          return;
        }
        var scripts = [];
        dojo.forEach(divs, function (div) {
          dojo.removeClass(div, "selected");
        });
        dojo.addClass(div, "selected");
        
        dojo.forEach(allScripts, function (script) {
          if (script.vendorId === vendor.id) {
            scripts.push(script);
          }
        });
        this.clearOldRows();
        qubit.Util.setText(this.vendorName, vendor.name);
        qubit.Util.setText(this.description, vendor.description);  
        this.renderVendorIcon(scripts, vendor);
        this.renderScriptSelectors(scripts);
        this.onVendorSelected(vendor);
      },
      onVendorSelected: function (vendor) {
        
      },
      getVendorIds: function (scripts) {
        var vendors = [], vendorMap = {};
        dojo.forEach(scripts, function (script) {
          if (!vendorMap[script.vendorId]) {
            vendors.push(script.vendorId);
            vendorMap[script.vendorId] = true;
          }
        });
        return vendors;
      },

      clearOldRows: function () {
        if (this.rows) {
          dojo.forEach(this.rows, function (row) {
            dojo.destroy(row);
          });
        }
      },

      getVendorIconUrl:  function (scripts, vendor) {
        var urls = dojo.map(scripts, function (script) {
          return script.imageUrl;
        });
        urls = dojo.filter(urls, function (url) {
          return url && url !== "";
        });
        
        if (urls.length > 0) {
          return urls[0];
        } else {
          return vendor.imageUrl || null;
        }
      },

      renderVendorIcon: function (scripts, vendor) {
        this.removeVenderIcon();
        var url = this.getVendorIconUrl(scripts, vendor),
          img = dojo.doc.createElement("img");
        if (url) {
          dojo.attr(img, {
            src: url
          });
          this.vendorImage.appendChild(img);
        }
      },

      removeVenderIcon: function () {
        dojo.forEach(this.vendorImage.childNodes,
          dojo.hitch(this, function (node) {
            this.vendorImage.removeChild(node);
          })
          );
      },

      renderScriptSelectors: function (scripts) {
        var maxCellsPerRow = 1, rowIndex = maxCellsPerRow, currentRow;
        this.rows = [];
        scripts.sort(function (a, b) {
          return (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1;
        });
        dojo.forEach(scripts, dojo.hitch(this, function (script) {
          var cell, scriptIcon;
          if (rowIndex === maxCellsPerRow) {
            currentRow = this.addRow();
            this.rows.push(currentRow);
            rowIndex = 0;
          }
          cell = currentRow.insertCell(-1);
          cell.script = script;
          scriptIcon = new qubit.qtag.ScriptIcon({script: script});
          
          scriptIcon.placeAt(cell);
          rowIndex += 1;
          dojo.connect(scriptIcon, "onSelect", this, this.selectCell);
        }));
      },

      selectCell: function (cell) {
        if (this.selectedCell && (this.selectedCell !== cell)) {
          this.selectedCell.unselectCell();
        }
        this.selectedCell = cell;
        this.onScriptChosen(this.selectedCell.script);
        dojo.addClass(cell, "selected");
      },

      addRow: function () {
        return this.chooser.insertRow(-1);
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Textarea");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.DependenciesExist", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", 
          "DependenciesExist.html?cb=" + qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Dependencies exist for this script",
          draggable: false
        });
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        dojo.connect(this.cancelButton, "onClick", this, this.hide);
        dojo.forEach(this.script.childDependencies, 
          dojo.hitch(this, function (id) {
            dojo.place("<li>" + this.scripts[id].name + "</li>", 
              this.dependencyNames);
          }));
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
      },
      hide: function () {
        this.popup.destroy();
        clearTimeout(this.zcTimeout);
      }
    });
});
//= require <qubit/GLOBAL>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.InlineEditBox");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Textarea");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.PaymentDecision", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "PaymentDecision.html?cb=" + 
          qubit.v),
      postCreate: function () {
        _gaq.push(['_trackPageview', '/PaymentDecision']);
        this.inherited(arguments);
        dojo.connect(this.hostButton, "onClick", this, this.doHost);
        dojo.connect(this.downloadButton, "onClick", this, this.doDownload);
      },
      doHost: function () {
        this.onDoHost();
      },
      onDoHost: function () {
        
      },
      doDownload: function () {
        _gaq.push(['_trackPageview', '/DownloadJS']);
        this.onProfilesDownloaded(this.profiles);
      },
      onProfilesDownloaded: function (profiles) {
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/SVRow>
//= require <qubit/qtag/SVRowCombiner>
//= require <qubit/JSValidator>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.SVCreator", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", 
          "SVCreator.html?cb=" + qubit.v),
      postCreate: function () {
        this.doingCustom = false;
        this.rows = [];
        this.operators = [];
        if (this.descriptor) {
          this.setValue(this.descriptor);
        } else {
          this.addNewRow();
          this.addNewRow();
        }
        this.updateExcludeState(this.isExclude);
        
        //comment out line below to bring back classical textareas
        this.applyFormattingForScriptEditors();
      },
      /**
       * Function applying CodeMirror formatter to customJs and customStarter 
       * textarea nodes used with custom script objects.
       * @see http://codemirror.net/doc/manual.html for details.
       */
      applyFormattingForScriptEditors: function () {
        var callback, 
          CodeMirror = window.CodeMirror,
          config = {
            lineNumbers: true,
            mode: "text/javascript"
          };
        
        this.customJsCodeArea  = 
          CodeMirror.fromTextArea(this.customJs.domNode, config);
        this.customStarterCodeArea = 
          CodeMirror.fromTextArea(this.customStarter.domNode, config);
        
        //refreshing at real time DOM appearance is important
        this.customJs.startup = 
          dojo.hitch(this, this.refreshTextareasCMEditor);
        this.customStarter.startup = 
          dojo.hitch(this, this.refreshTextareasCMEditor);
        
        this.JSValidator = qubit.DefaultJSValidatorInstance;
        
        callback = dojo.hitch(this, this.textareasUpdater);
        
        this.syncTextareasToCodeMirror();
        
        CodeMirror.on(this.customJsCodeArea, "change", callback);
        CodeMirror.on(this.customStarterCodeArea, "change", callback);
        
        this.jsSourceHolderPopupCheckbox.firstChild.onclick = 
          dojo.hitch(this, function (e) {
            this.validationPopups = !this.validationPopups;
            this.checkJSFieldForErrors();
          });
        
        this.JSValidator.clear();
      },
      
      startup: function () {
        this.refreshTextareasCMEditor();
      },
      /**
       * CodeMirror editors need refreshing for each DOM resizing operation.
       * This is a function for Textareas editor object refreshing.
       */
      refreshTextareasCMEditor: function () {
        if (this.customStarterCodeArea) {
          this.customStarterCodeArea.refresh();
        }
        if (this.customJsCodeArea) {
          this.customJsCodeArea.refresh();
        }
      },
      /**
       * Handler for copying data from CodeMirror editor instance created by 
       * applyFormattingForScriptEditors to plain textarea customJs and 
       * customStarter objects. This is necessary synchronisation processing
       * for backwards compatibility.
       */
      textareasUpdater: function () {
        this.customJs.setValue(this.customJsCodeArea.getValue());
        this.customStarter.setValue(this.customStarterCodeArea.getValue());
        this.checkJSFieldForErrors();
      },
      
      checkJSFieldForErrors: function () {
        var errors = this.JSValidator.validateScripts([
          "var x = {x: " + this.customJs.getValue() + "};",
          "var x = {x: " + this.customStarter.getValue() + "};"
        ], !this.validationPopups);
        if (errors) {
          this.jsSourceHolderNotification.innerHTML = 
            this.JSValidator.getFormattedMessage(errors);
        } else {
          this.jsSourceHolderNotification.innerHTML = 
            "<div class='msg'>No scripts detected.</div>";
        }
        if (errors && errors.critical) {
          this.criticalJSErrors = true;
        } else {
          this.criticalJSErrors = false;
        }
      },
      /**
       * Handler used to synchronise plain textareas (customJs and 
       * customStarter objects) with theirs CodeMirror
       * editing fields.
       */
      syncTextareasToCodeMirror: function (customJs, customStarter) {
        if (this.customJsCodeArea && this.customStarterCodeArea) {
          this.customJsCodeArea.setValue(customJs || this.customJs.getValue());
          this.customStarterCodeArea.setValue(customStarter ||
            this.customStarter.getValue());
        }
      },
      updateExcludeState: function (exclude) {
        this.isExclude = exclude;
        if (exclude) {
          dojo.addClass(this.customStarterHolder, "hidden");
        } else {
          dojo.removeClass(this.customStarterHolder, "hidden");
        }
      },
      addNewRow: function (type, value) {
        var row, fixSecondRow;
        fixSecondRow = (this.rows.length === 2) && 
          (!this.operators[0].getType());
        if (fixSecondRow) {
          this.operators[0].setType(type);
        }
        row = new qubit.qtag.SVRow({
          first: (this.rows.length === 0),
          value: value
        });
        if (this.rows.length > 0) {
          row.addNewRowListener(dojo.hitch(this, this.addNewRow));
          this.addRowCombiner(type);
          if (this.rows.length > 1) {
            this.rows[this.rows.length - 1].removeNewRowListener();
          }
        } else {
          dojo.connect(row, "onRowTypeChanged", this, this.rowTypeChanged);
        }
        if (this.rows.length > 0) {
          dojo.connect(row, "removed", this, this.createRowRemover(row));
        }
        row.placeAt(this.holder);
        this.rows.push(row);
        dojo.connect(this.jsButton, "onClick", this, this.customiseJs);
      },
      rowTypeChanged: function (isStarterBased) {
        dojo.forEach(this.rows, function (row, i) {
          if (i > 0) {
            if (isStarterBased) {
              dojo.addClass(row.domNode, "hidden");
              dojo.addClass(this.operators[i - 1].domNode, "hidden");
            } else {
              dojo.removeClass(row.domNode, "hidden");
              dojo.removeClass(this.operators[i - 1].domNode, "hidden");
            }
          }
        }, this);
      },
      createRowRemover: function (row) {
        return function () {
          var o, i = dojo.indexOf(this.rows, row);
          this.rows.splice(i, 1);
          row.destroy();
          if (i > 0) {
            o = this.operators.splice(i - 1, 1);
            o[0].destroy();
          }
        };
      },
      addRowCombiner: function (type) {
        var combiner;
        combiner = new qubit.qtag.SVRowCombiner({
          opType: type
        });
        combiner.placeAt(this.holder);
        this.operators.push(combiner);
      },
      customiseJs: function () {
        var customStarter = "";
        dojo.addClass(this.holder, "hidden");
        dojo.removeClass(this.customJsHolder, "hidden");
        this.customJs.setValue(this.getJs());
        if (this.getStarterJs() === 
            "function (session, cb) {setTimeout(cb, )}") {
          customStarter = "function (session, cb) {cb();}";
        } else {
          customStarter = this.getStarterJs();
        }
        this.customStarter.setValue(customStarter);
        this.doingCustom = true;
        
        this.syncTextareasToCodeMirror(this.getJs(), customStarter);
      },
      getJs: function () {
        var i, ii, js = [], rowJs;
        js.push(this.rows[0].getJs());
        for (i = 1, ii = this.rows.length; i < ii; i += 1) {
          try {
            rowJs = this.rows[i].getJs();
            if (this.operators[i - 1].getType() && rowJs) {
              js.push(this.operators[i - 1].getJs());
              js.push(rowJs);
            } else {
              break;
            }
          } catch (e) {
            break;
          }
        }
        return "function (session) {return " + js.join(" ") + ";}";
      },
      getStarterJs: function () {
        return "function (session, cb) {" + this.rows[0].getStarterJs() + "}";
      },
      getDescriptor: function () {
        if (this.doingCustom) {
          return this.getCustomDescriptor();
        } else {
          return this.getNonCustomDescriptor();
        }
      },
      getCustomDescriptor: function () {
        return {
          customJs: this.customJs.getValue(),
          customStarter: this.isExclude ?
            "function (session, cb) {cb();}" :
            this.customStarter.getValue()
        };
      },
      getNonCustomDescriptor: function () {
        var i, ii, descriptor, rowDescriptor;
        descriptor = {
          rows: [],
          operators: []
        };
        descriptor.rows.push(this.rows[0].getDescriptor());
        for (i = 1, ii = this.rows.length; i < ii; i += 1) {
          rowDescriptor = this.rows[i].getDescriptor();
          if (this.operators[i - 1].getType() && 
              !dojo.hasClass(this.rows[i].domNode, "hidden") && rowDescriptor) {
            descriptor.operators.push(this.operators[i - 1].getDescriptor());
            descriptor.rows.push(rowDescriptor);
          } else {
            break;
          }
        }
        return descriptor.rows.length > 0 ? descriptor : null;
      },
      getValue: function () {
        return JSON.stringify(this.getDescriptor());
      },
      setValue: function (value) {
        var i, ii, descriptor = JSON.parse(value);
        if (descriptor.customJs) {
          dojo.addClass(this.holder, "hidden");
          dojo.removeClass(this.customJsHolder, "hidden");
          this.customJs.setValue(descriptor.customJs);
          this.customStarter.setValue(descriptor.customStarter);
          this.doingCustom = true;
          
          this.syncTextareasToCodeMirror(descriptor.customJs,
            descriptor.customStarter);
        } else {
          if (descriptor.rows.length > 0) {
            this.addNewRow(null, descriptor.rows[0]);
            for (i = 1, ii = descriptor.rows.length; i < ii; i += 1) {
              this.addNewRow(descriptor.operators[i - 1], descriptor.rows[i]);
            }
            this.addNewRow();
          }
        }
      },
      validateForm: function () {
        if (!this.doingCustom) {
          return (dojo.every(this.rows, 
            function (row) {
              return row.validateForm();
            }));
        } else {
          return true;
        }
      }
    });
});
//:include qubit/widget/base/Dialog.js

/*
 * OpenTag, a tag deployment platform
 * Copyright 2011-2013, QuBit Group
 * http://opentag.qubitproducts.com
 */

(function () {
  
  var Dialog = qubit.widget.base.Dialog,
    Utils = qubit.widget.utils.Utils,
    log = new qubit.widget.base.Log("DisableABTestsPrompt: ");
  
  /**
   * A/B Tests confirmation prompt for en/di-sabling the tag lock.
   * 
   * @param config : {
   *   disableAction: function that is called on disable.
   *   cancelAction: function that is called on disable.
   * }
   * 
   * @author peter.fronc@qubitproducts.com
   */
  function DisableABTestsPrompt(config) {
    this.config = {};
    
    if (config) {
      if (config.tagName) {
        this.contentTemplate = 
          this.contentTemplate.replace("TAGNAME", '"' + config.tagName + '"');
      } else {
        this.contentTemplate = 
          this.contentTemplate.replace("TAGNAME", '');
      }
      DisableABTestsPrompt.superclass.call(this, config);
      
      this.config = config;
      this.moveable = true;
      
      log.FINE("DisableABTestsPrompt(config):");
      log.FINE(config, true);
      
      this.closeButton = new qubit.widget.base.Button({
        text: "Cancel",
        className: "green float-right"
      });
      
      this.disableButton = new qubit.widget.base.Button({
        text: "Disable",
        className: "float-right"
      });
      
      this.closeButton.clickAction = function () {
        this.close();
        if (this.config.cancelAction) {
          this.config.cancelAction();
        }
      }.bind(this);
      
      this.disableButton.clickAction = function () {
        this.close();
        if (this.config.disableAction) {
          this.config.disableAction();
        }
      }.bind(this);
      
      this.add(this.closeButton);
      this.add(this.disableButton);
    } else {
      DisableABTestsPrompt.superclass.call(this, config);
    }
  }
  
  Utils.clazz("qubit.qtag.ui.DisableABTestsPrompt",
    DisableABTestsPrompt,
    Dialog);
  
  DisableABTestsPrompt.prototype.className +=
    " disable-ab-tests-prompt";
  
  /**
   * DisableABTestsPrompt DOM view template.
   * 
   * @type {string}
   */
  DisableABTestsPrompt.prototype.contentTemplate = [
    '<h1 class="header-trigger">Disable A/B Testing in Deliver</h1>',
    '<div><br/><br/>',
    'After disabling this, any layers triggering the tag ',
    'TAGNAME in Deliver will stop functioning.',
    '<br/><br/>',
    'Are you sure you want to proceed?',
    '</div>'
  ].join('');

}());

//document.ondblclick = function () {
//  (new qubit.widget.base.DisableABTestsPrompt({})).paint();
//};
//:include qubit/widget/base/TextInput.js
//:include qubit/widget/base/Dialog.js

/*
 * OpenTag, a tag deployment platform
 * Copyright 2011-2013, QuBit Group
 * http://opentag.qubitproducts.com
 */

(function () {
  
  var Dialog = qubit.widget.base.Dialog,
    Utils = qubit.widget.utils.Utils,
    TextInput = qubit.widget.base.TextInput,
    log = new qubit.widget.base.Log("TagAccessorStringDialog: ");
  
  /**
   * Tag Accessor String dialog.
   * Simple dialog used to present nice accessing string together with unlock
   * function. It consists on description body, one iput and standard close
   * button.
   * 
   * @param config : {
   *  [widget base defaults],
   *  onSave: function to be triggered on save click,
   *  tagMasterId: initial input value,
   *  tagName: tag name
   * }
   * 
   * @author peter.fronc@qubitproducts.com
   */
  function TagAccessorStringDialog(config) {
    this.config = {};
    
    if (config) {
      var tmp = [
        'Click “Create layer” to generate an experiment ',
        'in Deliver.',
        '<br/><br/>',
        'Please note that other Filters that you create inside the tag',
        ' may affect its triggering conditions.'
      ].join('');

      if (config && !config.tagMasterId) {
        tmp = [
          'Tag is not saved. Please click the "View ',
          'trigger code" button after it\'s saved.'
        ].join('');
      }
      
      this.contentTemplate = this.contentTemplate.replace("#msg#", tmp);
    }
    
    TagAccessorStringDialog.superclass.call(this, config);
    
    if (config) {
      this.config = config;
      this.moveable = true;
      
      log.FINE("TagAccessorStringDialog(config):");
      log.FINE(config, true);
      
      this.triggerCode = new qubit.widget.base.BaseWidget({
        viewTemplate: '<a href="javascript://">+ Show trigger code</a>'
      });
      
      this.input = new TextInput({
        hint: "script is not saved yet...",
        className: "string-input",
        readOnly: true
      });
      
      this.clipEmailText = new qubit.widget.base.BaseWidget({
        className: "clip-email",
        viewTemplate: this.clipEmailTemplate
      });
      
      this.triggerCode.add(this.input);
      this.triggerCode.add(this.clipEmailText);
      
      this.input.hide();
      this.clipEmailText.hide();
      
      this.triggerCode.button = this.triggerCode.container.children[0];
      this.triggerCode.button.onclick = function () {
        if (this.uncollapsed) {
          this.uncollapsed = false;
          this.input.hide();
          this.clipEmailText.hide();
          this.triggerCode.button.innerHTML = "+ Show trigger code";
        } else {
          this.uncollapsed = true;
          this.input.show();
          this.clipEmailText.show();
          this.triggerCode.button.innerHTML = "- Hide trigger code";
          var clip = new window.ZeroClipboard.Client();
          clip.setText(this.copyText);    
          setTimeout(function () {
            if (this.copyToClipboardNode) {
              this.copyToClipboardNode.style.zIndex = '120';
              clip.glue(this.copyToClipboardNode);
            }
          }.bind(this), 250);
        }
      }.bind(this);
      
      this.warning = new qubit.widget.base.BaseWidget({
        viewTemplate: this.warningTemplate
      });
      
      var deliverLink = [
        'https://dashboard.qubitproducts.com/deliver/opentag/',
        config.tagMasterId,
        '?name=',
        encodeURIComponent(config.tagName)
      ].join("");
      
      this.closeButton = new qubit.widget.base.Button({
        text: "&nbsp;&nbsp;Close&nbsp;&nbsp;",
        className: "close float-right",
        clickAction: function () {
          this.close();
        }.bind(this)
      });
      
      this.deliverButton = new qubit.widget.base.Button({
        text: "Create layer",
        className: "green close float-right",
        clickAction: function () {
          this.close();
          window.open(deliverLink, "_blank");
        }.bind(this)
      });
      
      if (config.tagMasterId) {
        this.add(this.triggerCode);
        this.add(this.warning);
        this.add(this.deliverButton);
        this.copyToClipboardNode = 
          this.clipEmailText.container.children[0].children[0];
        Utils.addClass(this.copyToClipboardNode, "clip-wrap");
      }
      
      this.add(this.closeButton);
      
      if (config.onSave) {
        this.onSave = config.onSave;
      }
      
      if (config.tagMasterId) {
        var value = "qubit.opentag.Tags.getById('Q" +
          config.tagMasterId + "').unlock()";
        this.input.setValue(value);
        this.copyText = value;
      }
      
    }
  }
  
  Utils.clazz("qubit.qtag.ui.TagAccessorStringDialog",
    TagAccessorStringDialog,
    Dialog);
  
  TagAccessorStringDialog.prototype.className +=
    " tag-accessor-string-dialog";
  
  TagAccessorStringDialog.prototype.warningTemplate = [
    '<div class="red-alert"><br/>Remember to commit changes made to the ',
    'container before publishing the',
    ' layer in Deliver.</div>'
  ].join("");
  
  TagAccessorStringDialog.prototype.clipEmailTemplate = [
    '<div>&nbsp;&nbsp;',
    '<a href="#">Copy to clipboard</a>',
    '</div>'
  ].join("");
  
  /**
   * TagAccessorStringDialog DOM view template.
   * 
   * @type {string}
   */
  TagAccessorStringDialog.prototype.contentTemplate = [
    '<h1 class="header-trigger">A/B Testing Instructions</h1>',
    '<div class="height-margins-8px">',
    '<br/><br/>',
    '#msg#',
    '<br/><br/>',
    '</div>'
  ].join('');

}());

//document.ondblclick = function () {
//  (new qubit.widget.base.TagAccessorStringDialog({})).paint();
//};
//= require <qubit/GLOBAL>
//= require <qubit/qtag/data/dao/ProfileDAO>
//= require <qubit/qtag/UniversalVariable>
//= require <qubit/qtag/CustomVariable>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.PageVariables", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Page Variables",
      templateString: dojo.cache("qtag.templates", "PageVariables.html?cb=" + 
          qubit.v),
      postCreate: function () {
        this.universalVars = [];
        this.customVars = [];
        this.refresh();
        dojo.connect(this.testUrlButton, "onClick", this, this.showStatuses);
        dojo.connect(this.closeButtonTop, "onClick", this, this.close);
        dojo.connect(this.closeButtonBottom, "onClick", this, this.close);
      },
      refresh: function () {
        dojo.forEach(this.universalVars, function (widget) {
          dojo.destroy(widget.domNode);
        });
        dojo.forEach(this.customVars, function (widget) {
          dojo.destroy(widget.domNode);
        });
        this.universalVars = [];
        this.customVars = [];
        qubit.qtag.data.dao.ProfileDAO.getProfileVariables(this.profile.id)
                .then(dojo.hitch(this, this.showVariables));
      },
      showVariables: function (variables) {
        variables.sort(function (a, b) {
          var aName, bName;
          aName = a.name.toLowerCase();
          bName = b.name.toLowerCase();
          return (aName > bName) ? 1 : ((aName === bName) ? 0 : -1);
        });
        
        dojo.forEach(variables, dojo.hitch(this, function (variable) {
          var universalVariable, customVariable;
          if (variable.jsName) {
            universalVariable = new qubit.qtag.UniversalVariable({
              variable: variable
            });
            universalVariable.placeAt(this.universalVariables);
            this.universalVars.push(universalVariable);
          } else {
            customVariable = new qubit.qtag.CustomVariable({
              variable: variable,
              profileId: this.profile.id,
              onSave: dojo.hitch(this, this.refresh)
            });
            customVariable.placeAt(this.customVariables);
            this.customVars.push(customVariable);
          }
        }));
        if (this.universalVars.length === 0) {
          dojo.addClass(this.universalVariablesHolder, "hidden");
        }
        if (this.customVars.length === 0) {
          dojo.addClass(this.customVariablesHolder, "hidden");
        }
        if ((this.universalVars.length > 0) || (this.customVars.length > 0)) {
          dojo.addClass(this.emptyHolder, "hidden");
        }
        this.makeBookmarklet(variables);
      },
      makeBookmarklet: function (variables) {
        var task, url;
        task =  "QTag = {};";
        task += "QTag.globalEval = function (src) {";
        task += "  QTag.globalEval.retVal = undefined;";
        task += "  if (window.execScript) {";
        task += "    window.execScript('QTag.globalEval.retVal = ('+src+')');";
        task += "  } else {";
        task += "    var fn = function () {";
        task += "      window['eval']";
        task += "        .call(window, 'QTag.globalEval.retVal = ('+src+')');";
        task += "    };";
        task += "    try {";
        task += "      fn();";
        task += "    } catch (ex) {";
        task += "      return ex;";
        task += "    }";
        task += "  }";
        task += "  return QTag.globalEval.retVal;";
        task += "};";
        task += "QTag.variableExists = function (value) {";
        task += "  return (value !== undefined) && (value !== null)";
        task += "};";
        task += "QTag.getQueryParam = function (param) {";
        task += "  var i, ii, params, url, query, queries, splitQuery;";
        task += "  url = QTag.getUrl();";
        task += "  if (url.indexOf('?') > 0) {";
        task += "    queries = url.substring(url.indexOf('?') + 1).split('&');";
        task += "    for (i = 0, ii = queries.length; i < ii; i += 1) {";
        task += "      query = queries[i];";
        task += "      if (query.indexOf('=') > 0) {";
        task += "        splitQuery = query.split('=');";
        task += "        if ((splitQuery.length === 2) && " +
          "(splitQuery[0] === param)) {";
        task += "          return splitQuery[1];";
        task += "        }";
        task += "      }";
        task += "    }";
        task += "  }";
        task += "  return null;";
        task += "};";
        task += "QTag.getCookieValue = function (name) {";
        task += "  var r, cookie, value, cookies, nameSearchString, i, ii;";
        task += "  nameSearchString = name + '=';";
        task += "  cookies = document.cookie.split(';');";
        task += "  r = /^\\s+|\\s+$/g;";
        task += "  for (i = 0, ii = cookies.length; i < ii; i += 1) {";
        task += "    cookie = cookies[i].replace(r, '');";
        task += "    if (cookie.indexOf(nameSearchString) === 0) {";
        task += "      value = " +
          "unescape(cookie.substring(nameSearchString.length));";
        task += "      if (value.length === 0) {";
        task += "        return null;";
        task += "      }";
        task += "      return value;";
        task += "    }";
        task += "  }";
        task += "  return null;";
        task += "};";
        task += "QTag.getElementValue = function (elementId) {";
        task += "  var el = document.getElementById(elementId);";
        task += "  if (el) {";
        task += "    return el.textContent || el.innerText;";
        task += "  }";
        task += "  return null;";
        task += "};";
        task += "QTag.getUrl = function () {";
        task += "  return document.location.href;";
        task += "};";
        task += "QTag.getJsVariable = function (value) {";
        task += "  var variable;";
        task += "  if (value.indexOf('[#]') === -1) {";
        task += "    variable = QTag.globalEval(value);";
        task += "  } else {";
        task += "    variable = QTag.getArrayPageVariableExists(value);";
        task += "    if (variable) {";
        task += "      variable = QTag.globalEval(variable);";
        task += "    }";
        task += "  }";
        task += "  return variable";
        task += "};";
        task += "QTag.getArrayPageVariableExists = function (value) {";
        task += "  var i, ii, x, exists, arrayEmpty, curr, segments;";
        task += "  exists = true;";
        task += "  arrayEmpty = false;";
        task += "  curr = '';";
        task += "  segments = value.split('[#]');";
        task += "  for (i = 0, ii = segments.length - 1; " +
          "exists && (i < ii); i += 1) {";
        task += "    curr += segments[i];";
        task += "    try {";
        task += "      x = QTag.globalEval(curr);";
        task += "    } catch (e) {";
        task += "      exists = false;";
        task += "    }";
        task += "    exists = exists && QTag.variableExists(x);";
        task += "    if (exists) {";
        task += "      if (x.length === 0) {";
        task += "        arrayEmpty = true;";
        task += "        break;";
        task += "      }";
        task += "      curr += '[0]';";
        task += "    }";
        task += "  }";
        task += "  if (!exists) {";
        task += "    return null;";
        task += "  } else {";
        task += "    if (arrayEmpty) {";
        task += "      return curr;";
        task += "    } else {";
        task += "      return value.replace('[#]', '[0]');";
        task += "    }";
        task += "  }";
        task += "};";
        task += "var d = document.createElement('div');";
        task += "d.style.position = 'absolute';";
        task += "d.style.bottom = 0;";
        task += "d.style.height = '100px';";
        task += "d.style.overflowY = 'auto';";
        task += "d.style.borderTop = '1px solid black';";
        task += "d.style.width = '100%';";
        task += "d.style.backgroundColor = '#FFFFFF';";
        task += "document.body.appendChild(d);";
        task += "var t = document.createElement('table');";
        task += "d.appendChild(t);";
        task += "var b = document.createElement('input');";
        task += "b.type = 'button';";
        task += "b.style.position = 'absolute';";
        task += "b.style.top = '0px';";
        task += "b.style.right = '1px';";
        task += "b.value = 'close';";
        task += "b.onclick = function () {document.body.removeChild(d);};";
        task += "d.appendChild(b);";
        task += "if(" + variables.length + " > 0){";
        variables = _.filter(variables, function (v) {
          return v.typeId !== 1;
        });
        task += dojo.map(variables, 
          dojo.hitch(this, this.generateTester)).join();
        task += ";} else {";
        task += "  var r = t.insertRow(-1);";
        task += "  dt = r.insertCell(-1);";
        task += "  dt.style.color = '#000000';";
        task += "  dt.textContent = 'No variables to look for.'";
        task += "}";
        
        url = "javas";
        url += "cript:(function(){" + window.escape(task);
        url += "})()";

        this.bookmarklet.href = url;
      },
      getVariableSummary: function (variable) {
        var summary = variable.name + " ";
        if (variable.jsName) {
          summary += "<" + variable.jsName.replace("[#]", "[]") + ">";
        } else if (variable.typeId === 2) {
          summary += "<JS Code>";
        } else if (variable.typeId === 3) {
          summary += "<QueryParam: " + variable.value + ">";
        } else if (variable.typeId === 4) {
          summary += "<Cookie: " + variable.value + ">";
        } else if (variable.typeId === 5) {
          summary += "<DOM Id: " + variable.value + ">";
        }
        return summary;
      },
      generateTester: function (variable) {
        var syntaxError, task = "(function () { try {";
        task += "var value = null, exists = false;";
        if (variable.jsName) {
          task += "try { value = QTag.getJsVariable('" + variable.jsName + 
            "');} catch (e) {}";
        } else if (variable.typeId === 2) {
          syntaxError = false;
          try {
            //toString is JSLint related only (unused),
            //we are testing the syntax only
            (new Function("var value = (" + variable.value + ")")).toString();
          } catch (ex) {
            //Very carefull check of possible EOL and Quotes in core exception
            //The characters must be excluded so syntaxError can be injected 
            //into script body.
            syntaxError = ex.toString().replace(/"/g, "\\\"");
            syntaxError = syntaxError.replace(/[\r\n]/g, "");
            syntaxError = '"' + syntaxError + '"';
          }
          task += "try { value = (" + (syntaxError || variable.value) +
                  ");} catch (e) {}";
        } else if (variable.typeId === 3) {
          task += "try { value = QTag.getQueryParam('" + variable.value +  
            "');} catch (e) {}";
        } else if (variable.typeId === 4) {
          task += "try { value = QTag.getCookieValue('" + variable.value +  
            "');} catch (e) {}";
        } else if (variable.typeId === 5) {
          task += "try { value = QTag.getElementValue('" + variable.value + 
            "');} catch (e) {}";
        }
        task += "exists = QTag.variableExists(value);";
        task += "var r = t.insertRow(-1);";
        task += "dt = r.insertCell(-1);";
        task += "dt.style.color = '#000000';";
        task += "if (exists) {";
        task += "  if (value instanceof Array) {";
        task += "    if (value.length === 0) {";
        task += "      dt.textContent += ('\"" + 
          this.getVariableSummary(variable) + "\" is an empty array');";
        task += "    } else {";
        task += "      dt.textContent += ('\"" + 
          this.getVariableSummary(variable) + "\" has value: '+value);";
        task += "    }";
        task += "  } else {";
        task += "    dt.textContent += ('\"" + 
          this.getVariableSummary(variable) + "\" has value: '+value);";
        task += "  }";
        task += "} else {";
        task += "  dt.textContent += ('\"" + 
          this.getVariableSummary(variable) + "\" does not exist.');";
        task += "}";
        task += "} catch (e) {} })()";
        return task;
      },
      close: function () {
        qubit.qtag.WindowManager.showDashboard();
      }
    });
});
//= require <qubit/GLOBAL>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.DashboardHolder", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Dashboard",
      templateString: dojo.cache("qtag.templates", "DashboardHolder.html?cb=" + 
          qubit.v),
      postCreate: function () {
        
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/qtag/data/dao/ProfileDAO>
//= require <qubit/data/Permissions>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.SaveProfile", [dijit._Widget, dijit._Templated], {
    widgetsInTemplate: true,
    templateString: dojo.cache("qtag.templates", "SaveProfile.html?cb=" + 
        qubit.v),
    postCreate: function () {

      qubit.Util.setText(this.profileName, this.profile.name);
      qubit.data.Permissions.setupButton(this.commitProfile, this,
          this.doSave, "saveProfile");
      qubit.data.Permissions.setupButton(this.revertProfile, this, 
          this.doRevertProfile, "revertProfile");
      if (!this.profile.needsSaving()) {
        this.hideButtons();
        qubit.Util.setText(this.commitState, "Determining state...");
        this.profileStateManager.updateProfileState(this.profile.id, 
          this.commitState); 
      } else {
        this.showButtons();
        dojo.connect(this.profileStateManager, "onProfileCommitStarted", 
          this, this.profileCommitStarted);
        dojo.connect(this.profileStateManager, "onProfileCommitFinished", 
            this, this.profileCommitFinished);
        dojo.connect(this.profileStateManager, "onProfileRevertStarted", 
            this, this.profileRevertStarted);
        dojo.connect(this.profileStateManager, "onProfileRevertFinished", 
            this, this.profileRevertFinished);
      }
    },
    profileCommitStarted: function (profile) {
      if (profile.id === this.profile.id) {
        this.hideButtons();
        qubit.Util.setText(this.commitState, "Saving");
      }
    },
    profileCommitFinished: function (profile, pushingToCdn, succeeded) {
      if (profile.id === this.profile.id) {
        this.hideButtons();
        if (pushingToCdn) {
          this.profileStateManager.updateProfileState(this.profile.id, 
            this.commitState);
        } else if (succeeded) {
          qubit.Util.setText(this.commitState, "Profile Committed");
          this.profileStateManager.removeListener(this.profile.id, 
              this.commitState);
        }
      }
    },
    profileRevertStarted: function (obj) {
      var profile = obj.profile;
      if (profile.id === this.profile.id) {
        this.hideButtons();
        qubit.Util.setText(this.commitState, "Reverting");
      }
    }, 
    profileRevertFinished: function (obj) {
      if (obj.error) {
        qubit.Util.setText(this.commitState, obj.error);
        qubit.DefaultNotificationsMgr.notify(
                "reverting-cancelled",
                "Reverting cancelled: " + obj.error,
                4000);
      } else {
        var profile = obj.profile;
        if (profile.id === this.profile.id) {
          this.hideButtons();
          qubit.Util.setText(this.commitState, "Reverted");
        }
      }
    }, 
    doSave: function () {
      this.profileStateManager.verifyClientState([this.profile], 
        dojo.hitch(this, this.saveOk));
    },
    saveOk: function () {
      this.hideButtons();
      qubit.Util.setText(this.commitState, "Saving");
      this.profileStateManager.commitProfile(this.profile, this.commitState);
    },
    doRevertProfile: function () {
      this.hideButtons();
      qubit.Util.setText(this.commitState, "Undoing");
      this.profileStateManager.revertProfile(this.profile.id);
    },
    hideButtons: function () {
      dojo.addClass(this.commitProfile.domNode, "hidden");
      dojo.addClass(this.revertProfile.domNode, "hidden");
      dojo.removeClass(this.commitState, "hidden");
    },
    showButtons: function () {
      dojo.removeClass(this.commitProfile.domNode, "hidden");
      dojo.addClass(this.revertProfile.domNode, "hidden");
      //dojo.removeClass(this.revertProfile.domNode, "hidden");
      dojo.addClass(this.commitState, "hidden");
    },
    needsSaving: function () {
      return this.profile.needsSaving();
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/CommitCheck>
//= require <qubit/qtag/CommitFinished>

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.ProfileStateManager", [], {
    setProfiles: function (profiles) {
      this.profilesById = {};
      dojo.forEach(profiles, dojo.hitch(this, function (profile) {
        this.profilesById[profile.id] = {
          profile: profile,
          lastCheckTime: 0,
          statusHolders: [],
          isUpdating: this.isProfileStatusChanging(profile)
        };
      }));
    },
    isProfileStatusChanging: function (profile) {
      return (profile.needsSaving() || (profile.invalidationToken > 0));
    },
    commitProfile: function (profile, updateHolder) {
      new qubit.qtag.CommitCheck({
        onSave: dojo.hitch(this, 
          dojo.partial(this.doCommitProfile, profile, updateHolder))
      }).show();
    },
    doCommitProfile: function (profile, updateHolder) {
      var profileHolder = this.profilesById[profile.id];
      profileHolder.profile.markAsSaved();
      this.onProfileCommitStarted(profileHolder.profile);
      qubit.qtag.data.dao.ProfileDAO.saveProfile(profile.id, 
          dojo.hitch(this, dojo.partial(this.profileCommitted, profile.id)));
      
      profileHolder.statusHolders.push(updateHolder);
      dojo.forEach(profileHolder.statusHolders, function (l) {
        qubit.Util.setText(l, "Saving");
      });
    },
    profileCommitted: function (profileId, invalidationToken) {
      var text, pushingToCdn, succeeded, profileHolder;
      profileHolder = this.profilesById[profileId];
      if (invalidationToken === qubit.qtag.data.dao.ProfileDAO.WriteFailed) {
        text = "Cannot save - one of your tags has bad syntax";
        pushingToCdn = false;
        succeeded = false;
      } else if (invalidationToken ===
                 qubit.qtag.data.dao.ProfileDAO.WriteLocked) {
        text = "Commit failed. There is another commit in progress. " +
          "Please refresh your screen.";
        
        pushingToCdn = false;
        succeeded = false;
      } else if (invalidationToken === 
          qubit.qtag.data.dao.ProfileDAO.WriteDenied) {
        text = "Profile committed";
        pushingToCdn = false;
        succeeded = true;
      } else if (invalidationToken > 0) {
        text = "Pushing out to CDN";
        this._updateCommitStateText(profileId);
        pushingToCdn = true;
        succeeded = true;
      } else {
        text = "Saved";
        pushingToCdn = false; 
        succeeded = true;
      }
      
      dojo.forEach(profileHolder.statusHolders, function (l) {
        qubit.Util.setText(l, text);
      });
      this.onProfileCommitFinished(profileHolder.profile, 
          pushingToCdn, succeeded);
          
      if (profileHolder.profile.showCommitFinishedPrompt && succeeded) {
        
        new qubit.qtag.CommitFinished({
          profile: profileHolder.profile
        }).show();
      }
    },
    
    onProfileCommitStarted: function (profile) {
      
    },
    onProfileCommitFinished: function (profile, pushingToCdn) {
      
    },
    
    revertProfile: function (profileId) {
      var profile = this.profilesById[profileId].profile;
      this.onProfileRevertStarted({
        profile: profile
      });
      qubit.qtag.data.dao.ProfileDAO.revertProfile(profileId, 
          dojo.hitch(this, this.onProfileReverted));
    },
    onProfileReverted: function (obj) {
      if (!(obj && obj.error)) {
        var profile = obj.profile;
        this.profilesById[profile.id].profile.markAsSaved();
      }
      this.onProfileRevertFinished(obj);
    },
    
    onProfileRevertStarted: function (obj) {
    },
    
    onProfileRevertFinished: function (obj) {
    },

    verifyClientState: function (profiles, action) {
      var d = new dojo.DeferredList([
        qubit.data.UserManager.getUser(),
        qubit.data.UserManager.getClientDetails()
      ]);
      d.then(dojo.hitch(this, dojo.partial(this._doVerifyClientState, 
          profiles, action)));
    },
    _doVerifyClientState: function (profiles, action, deferreds) {
      var widget, client, user;
      user = deferreds[0][1];
      client = qubit.data.UserManager.client;
      if (user.verified && !client.hostingSuspended) {
        action();
      } else if (!user.verified) {
        widget = new qubit.qtag.VerifyEmail();
        widget.show();
      }
    },
    saveExistantProfiles: function (cb) {
      qubit.qtag.data.dao.ProfileDAO.writeAllProfilesToS3();
      cb();
    },
    isProfileUpdating: function (profileId) {
      return this.profilesById[profileId].isUpdating; 
    },
    updateProfileState: function (profileId, element) {
      var profileHolder = this.profilesById[profileId];
      if (profileHolder.isUpdating) {
        profileHolder.statusHolders.push(element);
        this._updateCommitStateText(profileId);
        qubit.Util.setText(element, 
          this._getSaveStateText(profileHolder.lastState));
      }
    },
    _updateCommitStateText: function (profileId) {
      if (this.profilesById[profileId].lastCheckTime < 
          (new Date().getTime() - 60 * 1000)) {
        this.profilesById[profileId].lastCheckTime = new Date().getTime();
        qubit.qtag.data.dao.ProfileDAO.getSaveProgress(profileId, 
          dojo.hitch(this, dojo.partial(this._setCommitStateText, profileId)));
      } else {
        setTimeout(dojo.hitch(this, 
            dojo.partial(this._updateCommitStateText, profileId), 60 * 1000));
      }
    },
    _setCommitStateText: function (profileId, saveState) {
      var text, profileHolder;
      profileHolder = this.profilesById[profileId]; 
      profileHolder.lastState = saveState;
      text = this._getSaveStateText(saveState);
      if ((saveState === qubit.qtag.data.dao.ProfileDAO.InProgress) || 
          (saveState === qubit.qtag.data.dao.ProfileDAO.NotStarted)) {
        setTimeout(dojo.hitch(this, 
          dojo.partial(this._updateCommitStateText, profileId), 60 * 1000));
      } else if (saveState === qubit.qtag.data.dao.ProfileDAO.Completed) {
        this.onProfileSaveComplete(profileHolder.profile);
      }
      dojo.forEach(profileHolder.statusHolders, function (l) {
        qubit.Util.setText(l, text);
      });
    },
    _getSaveStateText: function (saveState) {
      var text;
      if (saveState === qubit.qtag.data.dao.ProfileDAO.Completed) {
        text = "Save completed";
      } else if ((saveState === qubit.qtag.data.dao.ProfileDAO.InProgress) || 
          (saveState === qubit.qtag.data.dao.ProfileDAO.NotStarted)) {
        text = "Pushing out to CDN";
      } else if (saveState === qubit.qtag.data.dao.ProfileDAO.Error) {
        text = "Account logged out. Please log in again.";
      } else {
        text = "Unknown state";
      }
      return text;
    },
    onProfileSaveComplete: function (profile) {
    },
    
    removeListener: function (profileId, listener) {
      var profileHolder = this.profilesById[profileId];
      profileHolder.statusHolders = dojo.filter(profileHolder.statusHolders, 
        function (l) {
          return l !== listener;
        });
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/CreateCustomVariable>
//= require <qubit/qtag/data/dao/UniversalVarDAO>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.Button");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CreateCustomScriptParam", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Create Custom Script Parameter",
      templateString: dojo.cache("qtag.templates", 
          "CreateCustomScriptParam.html?cb=" + qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Create Script Parameter"
        });
        dojo.addClass(this.popup.domNode, "CreateCustomScriptParamPopup");
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        this.customVars = this.customVars.concat([{
          name: "Select a custom variable...",
          id: -1
        }, {
          name: "New Custom Variable",
          id: -2
        }]);
        this.addCustomScriptsToSelector();
        this.useUniversalChanged();
        dojo.connect(this.form, "onSubmit", this, this.submitForm);
        dojo.connect(this.useUniversal, "onChange", this, 
            this.useUniversalChanged);
        dojo.connect(this.customVarSelector, "onChange", 
            this, this.customVarSelected);
        dojo.connect(this.cancel, "onClick", this, this.hide);
        dojo.connect(this.universalVarCategorySelector, "onChange", 
            this, this.showUniversalVars);
        
        this.ccv = new qubit.qtag.CreateCustomVariable({
          profileId: this.profileId,
          hideButtons: true,
          onSave: dojo.hitch(this, this.customVariableCreated)
        }).placeAt(this.customVariableHolder);
        qubit.qtag.data.dao.UniversalVarDAO.getUniversalVariables()
          .then(dojo.hitch(this, this.populateUniversalVars));

        dojo.connect(this.popup, "onCancel", this, this.onHide);
        dojo.connect(this.popup, "onHide", this, this.onHide);
        
        dojo.connect(this.hasDefault, "onClick", this,
          this.validateDefaultValueBox);
      },
      validateDefaultValueBox: function () {
        if (this.hasDefault.checked) {
          dojo.removeClass(this.defaultValueBox, "hidden");
        } else {
          dojo.addClass(this.defaultValueBox, "hidden");
        }
      },
      onHide: function (e) {
        this.ccv.doHide();
      },
      populateUniversalVars: function (universalVars) {
        var categories;
        universalVars = _.filter(universalVars, function (universalVar) {
          return universalVar.id !== 1;
        });
        this.universalVars = universalVars;
        categories = this.getUniversalVarCategories(universalVars);
        this.universalVarCategorySelector.addOption(dojo.map(categories,
          function (category) {
            return {
              label: category.substring(0, 1).toUpperCase() + 
                category.substring(1),
              value: category
            };
          }));
        this.universalVarCategorySelector.setValue(
          this.getCategory(universalVars[0])
        );
        if (this.customParam) {
          this.populate(this.customParam);
        }
      },
      getUniversalVarCategories: function (universalVars) {
        var categories = [], catMap = {};
        dojo.forEach(universalVars, dojo.hitch(this, function (universalVar) {
          var category = this.getCategory(universalVar);
          if (!catMap[category]) {
            categories.push(category);
            catMap[category] = 1;
          }
        }));
        return categories;
      },
      getCategory: function (universalVar) {
        var jsName = universalVar.jsName;
        return jsName.substring(jsName.indexOf(".") + 1, 
            jsName.indexOf(".", jsName.indexOf(".") + 1));
      },
      showUniversalVars: function () {
        var universalVars, selectedCategory;
        selectedCategory = this.universalVarCategorySelector.getValue();
        selectedCategory = "." + selectedCategory + ".";
        universalVars = _.filter(this.universalVars, function (universalVar) {
          return universalVar.jsName.indexOf(selectedCategory) >= 0;
        });
        while (this.universalVarSelector.options.length > 0) {
          this.universalVarSelector.removeOption(0);
        }
        this.universalVarSelector.addOption(dojo.map(universalVars,
          function (universalVar) {
            return {
              label: universalVar.name,
              value: universalVar.id.toString()
            };
          }));
      },
      populate: function (param) {
        this.nameField.setValue(param.paramName);
        this.token.setValue(param.token);
        this.defaultValue.setValue(param.defaultValue);
        
        if (param) {
          //existence of defaultValue decides if its used or not
          this.hasDefault.setValue(param.defaultValue !== undefined);
          if (!this.defaultValue.getValue()) {
            this.hasDefault.setValue(false);
          }
          this.validateDefaultValueBox();
        }
        
        if (param.scriptParam) {
          if (param.scriptParam.jsName) {
            this.useUniversal.setChecked(true);
            this.universalVarCategorySelector.setValue(
              this.getCategory(param.scriptParam)
            );
            //wait for the selector to update
            setTimeout(dojo.hitch(this, function () {
              this.universalVarSelector
                      .setValue(param.scriptParam.id.toString());
            }), 1);
          } else {
            this.useUniversal.setChecked(false);
            if (!!param.id) {
              this.customVarSelector.setValue(param.scriptParam.id.toString());
            } else {
              this.ccv.populate(param.scriptParam);
              this.customVarSelector.setValue("-2");
              dojo.removeClass(this.customVariableHolder, "hidden");
            }
          }
        }
      },
      useUniversalChanged: function () {
        var useUniversal = this.useUniversal.checked;
        dojo.addClass(this.customVariableHolder, "hidden");
        if (useUniversal) {
          this.universalVarSelector.setValue("some universal variable");
          dojo.removeClass(this.universalVarCategorySelector.domNode, "hidden");
          dojo.removeClass(this.universalVarSelector.domNode, "hidden");
          dojo.addClass(this.customVarSelector.domNode, "hidden");
        } else {
          dojo.addClass(this.universalVarCategorySelector.domNode, "hidden");
          dojo.addClass(this.universalVarSelector.domNode, "hidden");
          dojo.removeClass(this.customVarSelector.domNode, "hidden");
          if (this.customVarSelector.getValue() === "-2") {
            dojo.removeClass(this.customVariableHolder, "hidden");
          }
        }
      },
      customVarSelected: function () {
        if (!this.useUniversal.checked) {
          if (this.customVarSelector.getValue() === "-2") {
            try {
              dojo.removeClass(this.customVariableHolder, "hidden");
            } catch (e) {
              console.log(e);
            }
          } else {
            dojo.addClass(this.customVariableHolder, "hidden");
          }
        }
      },
      addCustomScriptsToSelector: function () {
        this.customVarSelector.addOption(dojo.map(this.customVars,
          dojo.hitch(this, function (customVar) {
            var name = customVar.name;
            if (customVar.typeId && customVar.value) {
              name += " (" + 
                qubit.qtag.data.dao.CustomVarDAO.typesById[customVar.typeId] + 
                " - \"" + customVar.value.substring(0, 10) + 
                ((customVar.value.length > 10) ? "..." : "") +
                "\")";
            }
            return {
              label: name,
              value: customVar.id.toString()
            };
          })));
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
        dojo.style(this.popup.domNode, {
          top: "100px"
        });
      },
      hide: function () {
        this.onHide();
        this.popup.destroy();
      },
      submitForm: function (e) {
        dojo.stopEvent(e);
        
        if (this.ccv && this.ccv.criticalErrors) {
          qubit.DefaultNotificationsMgr.notify("script-save",
            "<b>Please resolve errors in your script before saving!</b>");
          return;
        }
        
        if (this.form.validate() && 
            (this.useUniversal.checked || 
            this.customVarSelector.getValue() !== "-1")) {
      
          var defaultVal = "";
          if (this.hasDefault.checked) {
            defaultVal += this.defaultValue.getValue();
          }
          
          this.onSave({
            id: this.customParam ? this.customParam.id : 0,
            paramName: this.nameField.getValue(),
            defaultValue: defaultVal,
            token: this.token.getValue(),
            valueId: this.getValueId(),
            scriptParam: this.getValue()
          });
          this.hide();
        }
      },
      getValueId: function () {
        var useUniversal = this.useUniversal.checked;
        if (useUniversal) {
          return this.universalVarSelector.getValue();
        } else {
          return this.customVarSelector.getValue();
        }
      },
      getValue: function () {
        var id, v, useUniversal = this.useUniversal.checked;
        if (useUniversal) {
          id = this.universalVarSelector.getValue();
          v = _.find(this.universalVars, function (uv) {
            return uv.id.toString() === id; 
          });
          return v;
        } else {
          id = this.customVarSelector.getValue();
          if (id === "-2") {
            v = this.ccv.getValue(); 
            v.name = this.nameField.getValue(); 
          } else {
            v = _.find(this.customVars, function (cv) {
              return cv.id.toString() === id; 
            });
          }
          return v;
        }
      },
      onSave: function () {
        
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Textarea");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CommitFinished", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "CommitFinished.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Uploading to CDN...",
          draggable: false
        });
        this.inherited(arguments);
      },
      doPostCreate: function (fname) {
        _gaq.push(['_trackPageview', '/GetCDNCode']);
        this.inherited(arguments);
        this.fileName =  "<script src='" + 
          fname +
          "' async defer></script>";
        this.profileNameEdited();
        dojo.connect(this.cancelButton, "onClick", this, this.hide);
        dojo.connect(this.showEmailLink, "onclick", this, this.showEmail);
        dojo.connect(this.sendEmailButton, "onClick", this, this.emailDev);
        dojo.connect(this.scriptDisplay, "onClick", 
          this, this.profileNameEdited);
      },
      zeroClipTimeout: function () {
        this.zcTimeout = setTimeout(dojo.hitch(this, function () {
          this.clip.reposition();
          this.zeroClipTimeout();
        }));
      },
      startup: function () {
        setTimeout(dojo.hitch(this, function () {
          this.clip = new window.ZeroClipboard.Client();
          this.clip.setText(this.fileName);
          this.clip.glue(this.copyButton.domNode);
          this.zeroClipTimeout();
        }), 100);
      },
      profileNameEdited: function (e) {
        this.scriptDisplay.setValue(this.fileName);
        this.scriptDisplay.domNode.select();
      },
      showEmail: function (e) {
        dojo.removeClass(this.cancelButtonPadding, "hidden");
        dojo.removeClass(this.emailDeveloperContainer, "hidden");
      },
      emailDev: function () {
        if (this.form.validate()) {
          qubit.qtag.data.dao.ProfileDAO.emailDev(this.form.getValues().email, 
            this.fileName).then(dojo.hitch(this, this.emailSent));
          this.sendEmailButton.set("disabled", true);
        }
      },
      emailSent: function () {
        this.sendEmailButton.set("disabled", false);
        this.status.success("Email sent");
      },
      show: function () {
        qubit.qtag.data.dao.ProfileDAO.getFileLocation(
          this.profile.id,
          function (fname) {
            this.popup.attr("content", this.domNode);
            this.popup.show();
            this.doPostCreate(fname);
          }.bind(this)
        );
      },
      hide: function () {
        clearTimeout(this.zcTimeout);
        if (this.dontShow.checked) {
          qubit.qtag.data.dao.ProfileDAO.alterProfile(this.profile.id, 
            null, null, false, false, false, false, 
            false, true, -1, function () {});
        }
        this.popup.destroy();
      }
    });
});
dojo.addOnLoad(function () {
  qubit.qtag.ConsentDefaults = {
    imageBackgroundUrl: "https://d3c3cq33003psk.cloudfront.net/" +
        "consent/img/cbg_w.png",
    imageIconUrl: "https://d3c3cq33003psk.cloudfront.net/" +
        "consent/img/background-image.png",

    defaultConsentScriptConfig: function () { // accessor
      var cookieAndPrivacyAndPolicyId = "cookieAndPrivacy",
        acceptButtonId = "buttonAccept",
        declineButtonId = "buttonDecline",
        cookieStatusId = "cookieStatus",
        closeButtonId = "closePopup";

      return {
        // Popup display configuration
        mode: "notification",
        acceptButtonText: "Enable Cookies",
        declineButtonText: "No, Thank You",
        acceptButtonId: "buttonAccept",
        declineButtonId: "buttonDecline",
        cookieStatusId: "cookieStatus",
        cookieAndPrivacyAndPolicyId: "cookieAndPrivacy",
        closeButtonText: "Dismiss",
        closeButtonId: "closePopup",
        statusAcceptedText: "Cookies Enabled",
        statusDeclinedText: "Cookies Disabled",

        cookieAndprivacyPolicyText: "privacy and cookies policy",
        cookieAndprivacyPolicyUrl:
            "http://www.yoursite.com/privacy",
        cookieDomain: "",

        whenIgnoredShowPopup: true, // When cookie not set, show popup?
        whenIgnoredShowStatus: true, // When cookie not set, show status?
        whenAcceptedHideStatus: true, // hide status on acceptance
        onIgnoreShowEvery: 2, // Message repeat (minutes)
        sampleRate: 1, // Message repeat (minutes)
        hidePopupOnBlur : true, // hide when clicked outside of popup
        onUserAccept: null, // Callback
        onUserDecline: null, // Callback
        onUserDismiss: null, // Callback
        onPreCreate: null, // Callback, before content is appended
        onPostCreate: null, // Callback after content is appended
        name: "internal config",
        cookieExpiryDays: 365, // Use by Cookie (session vs persitent)

        popup: {
          iframeCss: [
            'top: 0;',
            'left: 0;',
            'height: 185px;',
            'width: 100%;',
            'box-shadow: 0 0 20px 0px #888;',
            'z-index: 2147483647;' // note: Safari 3 will use 16777271
          ].join("\n"),

          headerHtml: [
            '<div class="content">',
            '  <div class="action-header">',
            '    <div class="close" id="{{closeButtonId}}">',
            '      {{closeButtonText}}',
            '    </div>',
            '  </div>',
            '</div>'
          ].join("\n"),

          contentCss: [
            'body {',
            '  padding-top: 8px;',
            '  text-align: center;',
            '  background: url(' + this.imageBackgroundUrl + ') repeat;',
            '  font-size: 12px;',
            '  line-height: 17px;',
            '  font-family: arial, helvetica;',
            '  color: #555;',
            '  text-shadow: 0px 0px 1px #CCC;',
            '}',

            '.content {',
            '  text-align: left;',
            '  width: 800px;',
            '  margin: 0 auto;',
            '  padding-top: 5px;',
            '}',

            'body p {',
            '  margin: 5px 0px;',
            '}',

            'a {',
            '  color: #2e9dc5;',
            '}',

            'h1 {',
            '  font-size: 1.4em;',
            '}',

            '.action-footer {',
            '  margin-top: 0px;',
            '}',

            '.action-footer .button {',
            '  padding: 5px 8px;',
            '  line-height: 16px;',
            '  cursor: pointer;',
            '}',

            '#{{closeButtonId}} {', // close button
            '  vertical-align: middle',
            '  color: #939598;',
            '  padding: 5px 10px 5px 10px;',
            '  font-size: 13px;',
            '  text-decoration: none;',
            '  margin-top: 0px;',
            '  float: right;',
            '  cursor: pointer;',
            '  border: 1px solid #EEE;',
            '  background: #EEE;',
            '  border-radius: 5px;',
            '}',

            '.action-footer #{{acceptButtonId}} {',
            '  -moz-box-shadow:inset 0px 1px 0px 0px #bbdaf7;',
            '  -webkit-box-shadow:inset 0px 1px 0px 0px #bbdaf7;',
            '  box-shadow:inset 0px 1px 0px 0px #bbdaf7;',
            '  background:-webkit-gradient( linear, left top, left ' +
              'bottom, color-stop(0.05, #35b7de), color-stop(1, #0189a1) );',
            '  background:-moz-linear-gradient( center top, #35b7de 5%,' +
              ' #0189a1 100% );',
            '  filter:progid:DXImageTransform.Microsoft.gradient(' +
              'startColorstr="#35b7de", endColorstr="#0189a1");',
            '  background-color:#35b7de;',
            '  -moz-border-radius:4px;',
            '  -webkit-border-radius:4px;',
            '  border-radius:4px;',
            '  border:1px solid #0189a1;',
            '  display:inline-block;',
            '  color:#fff;',
            '  font-weight:normal;',
            '  text-decoration:none;',
            '  vertical-align: middle;',
            '  float:right;',
            '}',

            '.action-footer #{{acceptButtonId}}:hover {',
            '  background:-webkit-gradient( linear, left top, left ' +
              'bottom, color-stop(0.05, #0189a1), color-stop(1, #35b7de) );',
            '  background:-moz-linear-gradient( center top,' +
              ' #0189a1 5%, #35b7de 100% );',
            '  filter:progid:DXImageTransform.Microsoft.gradient(' +
              'startColorstr="#0189a1", endColorstr="#35b7de");',
            '  background-color:#0189a1;',
            '}',

            '.action-footer #{{acceptButtonId}}:active {',
            '  position:relative;',
            '  top: 1px;',
            '}',

            '.action-footer #{{declineButtonId}} {',
            '  color: #555;',
            '  float:right;',
            '  margin-right: 15px;',
            '}'
          ].join("\n"),

          contentHtml: [
            '<div class="content">',
            '  <h1>Privacy and Cookies</h1>',
            '  <p>',
            '    For this website to run at its best, we ask the browser',
            '    (like Google Chrome and Internet Explorer) for a little ',
            '    personal information. Nothing drastic, just enough to ',
            '    remember your preferences, login ID, and what you like to ',
            '    look at (on our site). Having this information to hand  ',
            '    helps us understand your needs and improve our',
            '    service to you. ',
            '  </p>',
            '  <p>',
            '  If you would like to learn more about the information we ',
            '  store, how it is used or how to disable Cookies please read our',
            '    <a href="{{cookieAndprivacyPolicyUrl}}" ',
            '      target = "_blank"',
            '      id="{{cookieAndPrivacyAndPolicyId}}">',
            '      {{cookieAndprivacyPolicyText}}',
            '    </a>.',
            '  </p>',
            '</div>'
          ].join("\n"),

          footerHtml: [
            '<div class="content">',
            '   <div class="actions action-footer">',
            '     <div class="button" id="{{acceptButtonId}}">',
            '       {{acceptButtonText}}',
            '     </div>',
            '     <div class="button" id="{{declineButtonId}}">',
            '        {{declineButtonText}}',
            '     </div>',
            '   </div>',
            '</div>'
          ].join("\n")
        }, // end popup

        status: {
          iframeCss: [
            'bottom: 0;',
            'left: 0;',
            'height: 20px;',
            'width: 100%;',
            'z-index: 2147483647;' // note: Safari 3 will use 16777271
          ].join("\n"),

          headerHtml: '',

          contentCss: [
            'body {',
            '  background: transparent;',
            '  margin: 0;',
            '  padding: 0;',
            '  font-family: arial, helvetica;',
            '  text-align: center;',
            '  vertical-align: middle;',
            '  font-size: 12px;',
            '  line-height: 18px;',
            '}',

            '.content {',
            '  width: 800px;',
            '  margin: 0 auto;',
            '  text-align: left;',
            '}',

            'html>body #{{cookieStatusId}} {',
            '  width: auto;',
            '}',

            '#{{cookieStatusId}} {',
            '  padding: 1px 10px 0px 22px;',
            '  width: 11.5em;',
            '  cursor: pointer; !important',
            '}',

            '.icon {',
            '  background-image: url("' + this.imageIconUrl + '");',
            '  width: 20px;',
            '  height: 20px;',
            '  position: absolute;',
            '  background-position: 6px -116px;',
            '  background-repeat: no-repeat;',
            '  z-index: 199999;',
            '}',

            '.declined #{{cookieStatusId}} {',
            // button customisation settings below
            '  -webkit-box-shadow:inset 0px 1px 0px 0px #f5978e;',
            '  box-shadow:inset 0px 1px 0px 0px #f5978e;',
            '  background:-webkit-gradient( linear, left top, left ' +
              'bottom, color-stop(0.05, #f24537), color-stop(1, #c62d1f) );',
            '  background:-moz-linear-gradient( center top, #f24537 5%,' +
              ' #c62d1f 100% );',
            '  filter:progid:DXImageTransform.Microsoft.gradient(' +
              'startColorstr="#f24537", endColorstr="#c62d1f");',
            '  background-color:#f24537;',
            '  -moz-border-radius:5px 5px 0px 0px;',
            '  -webkit-border-radius:5px 5px 0px 0px;',
            '  border-radius:5px 5px 0px 0px;',
            '  border:1px solid #d02718;',
            '  display:inline-block;',
            '  color:#ffffff;',
            '  font-family:arial;',
            '  font-size:12px;',
            '  text-decoration:none;',
            '}',

            '.declined #{{cookieStatusId}}:hover {',
            '  background:-webkit-gradient( linear, left top, left ' +
              'bottom, color-stop(0.05, #c62d1f), color-stop(1, #f24537) );',
            '  background:-moz-linear-gradient( center top, #c62d1f 5%,' +
              ' #f24537 100% );',
            '  filter:progid:DXImageTransform.Microsoft.gradient(' +
              'startColorstr="#c62d1f", endColorstr="#f24537");',
            '  background-color:#c62d1f;',
            '}',

            '.declined #{{cookieStatusId}}:active {',
            '  position:relative;',
            '  top: 1px;',
            '}',

            '.accepted #{{cookieStatusId}} {',
            '  -moz-box-shadow:inset 0px 1px 0px 0px #6ebf26;',
            '  -webkit-box-shadow:inset 0px 1px 0px 0px #6ebf26;',
            '  box-shadow:inset 0px 1px 0px 0px #6ebf26;',
            '  background:-webkit-gradient( linear, left top, left ' +
              'bottom, color-stop(0.05, #7ca814), color-stop(1, #5e8007) );',
            '  background:-moz-linear-gradient( center top, #7ca814 5%,' +
              '#5e8007 100% );',
            '  filter:progid:DXImageTransform.Microsoft.' +
              'gradient(startColorstr="#7ca814", endColorstr="#5e8007");',
            '  background-color:#7ca814;',
            '  -moz-border-radius:5px 5px 0px 0px;',
            '  -webkit-border-radius:5px 5px 0px 0px;',
            '  border-radius:5px 5px 0px 0px;',
            '  border:1px solid #619908;',
            '  display:inline-block;',
            '  color:#ffffff;',
            '  font-family:arial;',
            '  font-size:12px;',
            '  font-weight:normal;',
            '  text-decoration:none;',
            '}',

            '.accepted #{{cookieStatusId}}:hover {',
            '  background:-webkit-gradient( linear, left top, left bottom,' +
              ' color-stop(0.05, #5e8007), color-stop(1, #7ca814) );',
            '  background:-moz-linear-gradient( center top, #5e8007 5%, ' +
              '#7ca814 100% );',
            '  filter:progid:DXImageTransform.Microsoft.gradient(' +
              'startColorstr="#5e8007", endColorstr="#7ca814");',
            '  background-color:#5e8007;',
            '}',

            '.accepted #{{cookieStatusId}}:active {',
            '  position:relative;',
            '  top: 1px;',
            '}'
          ].join("\n"),

          contentHtml: [
            '<div class="content">',
            '  <div class="icon"></div>',
            '  <div id="{{cookieStatusId}}"></div>',
            '</div>'
          ].join("\n"),

          footerHtml: ''
        } // end status
      };
    }
  }; 
});
//= require <qubit/GLOBAL>
//= require <qubit/util/HelpButton>
//= require <qubit/qtag/SaveProfile>
//= require <qubit/qtag/PaymentDialogue>
//= require <qubit/qtag/VerifyEmail>
//= require <qubit/data/Permissions>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.SaveProfiles", [dijit._Widget, dijit._Templated], {
    widgetsInTemplate: true,
    "class": "qubit-save-profiles",
    templateString: dojo.cache("qtag.templates", "SaveProfiles.html?cb=" + 
        qubit.v),
    postCreate: function () {
      this.profileSaversById = {};
      this.showProfileSavers();
      
      dojo.connect(this.profileStateManager, "onProfileCommitStarted", 
        this, this.update);
      dojo.connect(this.profileStateManager, "onProfileCommitFinished", 
        this, this.profileSaved);
      dojo.connect(this.profileStateManager, "onProfileRevertFinished", 
        this, this.profileRevertedFinished);
      dojo.connect(this.profileStateManager, "onProfileSaveComplete", this, 
          this.profileSaveComplete);
      this.update();
    },
    profileRevertedFinished: function (obj) {
      var profile = obj.profile;
      this.update();
      setTimeout(dojo.hitch(this, 
        dojo.partial(this.removeProfileSaver, profile)), 10 * 1000);
    },
    profileSaveComplete: function (savedProfile) {
      if (savedProfile.id === this.profiles.id) {
        setTimeout(dojo.hitch(this, 
            dojo.partial(this.removeProfileSaver, savedProfile)), 10 * 1000);
      }
    },
    update: function () {
      // this is an unused return,
      // it tells if profiles are to be saved (dirty or updates)
      var profilesToSave =
              dojo.some(dojox.lang.functional.values(this.profileSaversById),
                      function (profileSaver) {
                        return profileSaver.needsSaving();
                      });
    },
    showProfileSavers: function () {
      dojo.forEach(this.profiles, dojo.hitch(this, function (profile) {
        var profileSaver = new qubit.qtag.SaveProfile({
          profile: profile,
          checkClientSaveAbility: dojo.hitch(this, this.checkClientSaveAbility),
          profileStateManager: this.profileStateManager
        });
        profileSaver.placeAt(this.profilesToSave);
        this.profileSaversById[profile.id] = profileSaver;
      }));
    },
    profileSaved: function (savedProfile, pushingToCdn, succeeded) {
      if (!pushingToCdn && succeeded) {
        setTimeout(dojo.hitch(this, 
          dojo.partial(this.removeProfileSaver, savedProfile)), 10 * 1000);
      }
    },
    removeProfileSaver: function (savedProfile) {
      this.profiles = dojo.filter(this.profiles, function (profile) {
        return profile.id !== savedProfile.id;
      });
      dojo.destroy(this.profileSaversById[savedProfile.id].domNode);
      delete this.profileSaversById[savedProfile.id];
      if (this.profiles.length === 0) {
        this.onAllProfilesSaved();
      }
    },
    onAllProfilesSaved: function () {
      
    },
    profilesDownloaded: function (profiles) {
      var saves = new dojo.DeferredList(
        dojo.map(profiles, function (profile) {
          profile.markAsSaved();
          return qubit.qtag.data.dao.ProfileDAO.saveProfile(profile.id);
        })
      ); 
      saves.then(dojo.hitch(this, 
        dojo.partial(this.saveDownloadDone, profiles)));
    },
    saveDownloadDone: function (profiles) {
      dojo.forEach(profiles, dojo.hitch(this, function (profile) {
        qubit.qtag.data.dao.ProfileDAO.getFreeLinkUrl(
          profile.id,
          function (url) {
            window.open(url);
            this.profileSaversById[profile.id].profileInvalidated("");
          }
        );
      }));
      this.update();
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/CreateCustomScriptParam>

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CustomScriptParam",
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      useDragDrop: false,
      templateString: dojo.cache("qtag.templates", 
          "CustomScriptParam.html?cb=" + qubit.v),
      postCreate: function () {
        dojo.connect(this.editButton, "onClick", this, this.doEdit);
        dojo.connect(this.deleteButton, "onClick", this, this.doDelete);
        dojo.connect(this.domNode, "ondblclick", this, function (e) {
          if (e) {
            dojo.stopEvent(e);
          }
          this.doEdit();
        });
        this.populate();
      },
      doEdit: function (e) {
        new qubit.qtag.CreateCustomScriptParam({
          profileId: this.profileId,
          customParam: this.customParam,
          customVars: this.customVars,
          isCustomScript: true,
          onSave: dojo.hitch(this, this.customParamCreated)
        }).show();
      },
      doDelete: function () {
        this.onDelete(this.customParam, this);
      },
      onDelete: function () {
        
      },
      customParamCreated: function (customParam) {
        customParam.newParamId = this.customParam.newParamId;
        this.customParam = customParam;
        this.populate();
        this.onUpdate(customParam);
      },
      populate: function () {
        qubit.Util.setText(this.nameField, this.customParam.paramName);
        qubit.Util.setText(this.tokenField, this.customParam.token);
      },
      onUpdate: function (customParam) {
        
      },
      checkForTokens: function (tokens) {
        var found = false;
        dojo.forEach(tokens, dojo.hitch(this, function (token) {
          if (token.indexOf("${" + this.customParam.token + "}") >= 0) {
            found = true;
          }
        }));
        if (!found) {
          dojo.removeClass(this.notFound, "hidden");
        } else {
          dojo.addClass(this.notFound, "hidden");
        }
      }
    });
});
  //= require <qubit/GLOBAL>
//= require <qubit/qtag/ScriptChooser>
//= require <qubit/qtag/SVCreator>
//= require <qubit/qtag/data/dao/FilterDAO>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.Button");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.PreviewConsent",
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Preview Consent",
      templateString: dojo.cache("qtag.templates", "PreviewConsent.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Preview Consent"
        });
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        
        dojo.connect(this.reloadButton, "onClick", this, this.setPreviewUrl);
        dojo.connect(this, "startup", this,
          this.setPreviewUrl);
      },

      getUrlValue: function () {
        return this.siteUrl.getValue();
      },

      setPreviewUrl : function () {
        this.previewIframe.setAttribute("src", this.url);
        this.openNewWindowLink.setAttribute("href", this.url +
          "?siteUrl=http://www.qubitproducts.com");
      },


      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
        dojo.style(this.popup.domNode, {
          top: "100px"
        });
      },

      hide: function () {
        this.popup.destroy();
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/qtag/CreateCustomVariable>
//= require <qubit/widget/VariableDefaultValueDialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.ParamValueInput", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      paramValueId: -1,
      templateString: dojo.cache("qtag.templates", "ParamValueInput.html?cb=" + 
          qubit.v),
      postCreate: function () {
        dojo.addClass(this.swatch, "bgcolor");
        dojo.addClass(this.swatch, "bgcolor" + this.colorIndex);
        qubit.Util.setText(this.valueLabel, this.param.paramName);
        if (this.param.description) {
          this.helpButton.text = this.param.description;
        } else {
          dojo.addClass(this.helpButton.domNode, "invisible");
        }
        this.universalJsName.title = this.param.jsName;
        dojo.connect(this.useUniversal, "onChange", this, 
            this.useUniversalChanged);
        this.useUniversalChanged();
        
        this.customVars = [{
          name: "Select Custom Variable...",
          id: -1
        }].concat(this.customVars);
        
        if (this.param.universalVarId === 1) {
          this.useUniversal.setValue(false);
          dojo.addClass(this.useUniversalHolder, "hidden");
        }
        this.customVars = this.customVars.concat([{
          name: "Add New Custom Variable",
          id: -2
        }]);
        dojo.connect(this.customVarSelector, "onChange", 
            this, this.customVarSelected);
        this.addCustomScriptsToSelector();
        
        this.editDefaults.onclick = this.editDefaultsHandler.bind(this);
        
        this.checkIfCanHaveDefaults(this.param);
      },
      editDefaultsHandler: function () {
        var dialog, onSave;
        
        onSave = function () {
          this.defaultValue = dialog.input.getValue();
        }.bind(this);
        
        dialog = new qubit.widget.VariableDefaultValueDialog({
          inputValue: this.defaultValue,
          onSave: onSave,
          moveable: true
        });
        
        dialog.paint();
      },
      checkIfCanHaveDefaults: function (param, defaultValue) {
        if (!param.hasDefault) {
          dojo.addClass(this.editDefaults, "hidden");
        } else {
          dojo.removeClass(this.editDefaults, "hidden");
        }
        this.defaultValue = defaultValue;
        if (defaultValue === undefined) {
          this.defaultValue = ""; //lets use empty spaces always
        }
      },
      populate: function (param) {
        if (param.scriptParam.customVarId) {
          this.populateCustomVarParam(param);
        } else {
          this.populateUniversalVarParam(param);
        }
        
        this.checkIfCanHaveDefaults(param.scriptParam, param.defaultValue);
      },
      populateCustomVarParam: function (param) {
        this.useUniversal.setValue(false);
        this.customVarSelector.setValue(param.scriptParam.customVarId);
      },
      populateUniversalVarParam: function (param) {
        this.useUniversal.setValue(true);
        this.valueInput.setValue(param.scriptParam.valueName);
      },
      useUniversalChanged: function () {
        var useUniversal = this.useUniversal.checked;
        this.valueInput.set('disabled', useUniversal);
        if (useUniversal) {
          this.valueInput.setValue(this.param.valueName);
          dojo.removeClass(this.valueInput.domNode, "hidden");
          dojo.addClass(this.customVarSelector.domNode, "hidden");
        } else {
          dojo.addClass(this.valueInput.domNode, "hidden");
          dojo.removeClass(this.customVarSelector.domNode, "hidden");
        }
      },
      addCustomScriptsToSelector: function () {
        this.customVarSelector.addOption(dojo.map(this.customVars,
          dojo.hitch(this, function (customVar) {
            var name = customVar.name;
            if (customVar.typeId && customVar.value) {
              name += " " + "<span class='pvi_cvdetail'>" + "(" + 
                qubit.qtag.data.dao.CustomVarDAO.typesById[customVar.typeId] + 
                " - \"" + customVar.value.substring(0, 10) + 
                ((customVar.value.length > 10) ? "..." : "") +
                "\")" + "</span>  ";
            }
            return {
              label: name,
              value: customVar.id.toString()
            };
          })));
      },
      customVarSelected: function () {
        if (this.customVarSelector.getValue() === "-2") {
          new qubit.qtag.CreateCustomVariable({
            profileId: this.profileId,
            param: this.param,
            isNewTemplatedValue: true,
            onSave: dojo.hitch(this, this.customVariableCreated),
            onHide: dojo.hitch(this, this.selectPrevious)
          }).show();
        }
      },
      selectPrevious: function () {
        this.customVarSelector.setValue(this.customVars[0].id.toString());
      },
      customVariableCreated: function (customVar) {
        var name = customVar.name;
        if (customVar.typeId && customVar.value) {
          name += " " + "<span class='pvi_cvdetail'>" + "(" + 
            qubit.qtag.data.dao.CustomVarDAO.typesById[customVar.typeId] + 
            " - \"" + customVar.value.substring(0, 10) + 
            ((customVar.value.length > 10) ? "..." : "") +
            "\")" + "</span>  ";
        }
        this.customVarSelector.addOption([{
          label: name,
          value: customVar.id.toString()
        }]);
        setTimeout(dojo.hitch(this, function () {
          this.customVarSelector.setValue(customVar.id.toString());
        }), 10);
      },
      getParamValue: function () {
        var value = {
          id: this.param.id,
          defaultValue: this.defaultValue
        };
        if (this.useUniversal.checked) {
          value.universalVarId = this.param.universalVarId;
        } else {
          value.customVarId = this.customVarSelector.getValue();
        }
        return value;
      },
      setValue: function (value) {
        this.valueInput.setValue(value);
      },
      setId: function (id) {
        this.paramValueId = id;
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/WindowManager>
//= require <qubit/qtag/Dashboard>
//= require <qubit/qtag/DashboardHolder>
//= require <qubit/qtag/PageVariables>
//= require <qubit/qtag/stats/Statistics>
//= require <qubit/qtag/ScriptLibrary>
/*global qtag */
dojo.require("dijit.layout.TabContainer");
dojo.registerModulePath("qtag.templates", "/QDashboard/qtag/templates/");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.QTag", [dijit.layout.TabContainer], {
    "class": "qubit_qtag_QTag",
    doLayout: false,
    postCreate: function () {
      var tabs = dojo.map(this.getContents(), dojo.hitch(this, 
        function (contentPaneData) {
          var paneData, el;
          paneData = {
            title: contentPaneData.title
          };
          if (typeof (contentPaneData.Content) === "string") {
            paneData.content =  contentPaneData.Content;
            el = new dijit.layout.ContentPane(paneData);
          } else {
            el = new contentPaneData.Content({controller: this});
          }
          this.addChild(el);
          
          return el;
        }));
      qubit.qtag.WindowManager.setTabs(tabs);
      dojo.addClass(this.tablist.domNode, "qubit-tablist-panel");
    },
    startup: function () {
      this.inherited(arguments);
      qubit.qtag.WindowManager.showDashboard();
    },
    getContents: function () {
      var tabViews = [
        {
          title: "Dashboard",
          Content: qubit.qtag.DashboardHolder
        },
        {
          title: "Statistics",
          Content: qubit.qtag.stats.Statistics
        }
      ];
     
      if (qubit.Applications.isAdminUser()) {
        tabViews.push({
          title: "Script Library",
          Content: qubit.qtag.ScriptLibrary
        });
      }
      
      return tabViews;
    },
    showDashboard: function () {
      this.removeChild(this.getChildren()[0], 0);
      var dashboard = new qubit.qtag.Dashboard();
      this.addChild(dashboard, 0);
      this.selectChild(dashboard);
    },
    showScriptLibrary: function (selectedScript) {
      this.removeChild(this.getChildren()[0], 0);
      var scriptLibrary = new qubit.qtag.ScriptLibrary(selectedScript);
      this.addChild(scriptLibrary, 0);
      this.selectChild(scriptLibrary);
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/ProfileViewer>
//= require <qubit/qtag/CreateProfile>
//= require <qubit/qtag/SaveProfiles>
//= require <qubit/qtag/CreditCardNeeded>
//= require <qubit/qtag/ProfileStateManager>
//= require <qubit/qtag/data/dao/ProfileDAO>
//= require <qubit/data/Permissions>
//= require <qubit/qtag/data/dao/StatsDAO>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.Dashboard", [dijit._Widget, dijit._Templated], {
    widgetsInTemplate: true,
    templateString: dojo.cache("qtag.templates", "Dashboard.html?cb=" + 
        qubit.v),
    postCreate: function () {	
      _gaq.push(['_trackPageview', '/Dashboard']);
      this.profileViewers = [];
      qubit.data.Permissions.setupButton(this.createProfile, this,
          this.showCreateProfileDialogue, "addProfileToClient");
      dojo.connect(this.hideInactive, 'onClick', this, 
          this.hideInactiveProfiles);
      dojo.connect(this.showInactive, 'onClick', this, 
          this.showInactiveProfiles);
    },
    startup: function () {
        
      if (qubit.qtag.Dashboard.hasInactiveProfiles && 
          qubit.qtag.Dashboard.showingInactive) {
        this.showInactiveProfiles();
      } else {
        this.hideInactiveProfiles();  
      }
    },
    showCreateProfileDialogue: function () {
      var createProfile = new qubit.qtag.CreateProfile({
        updateProfiles: dojo.hitch(this, this.updateProfiles)
      });
      createProfile.show();
    },
    hideInactiveProfiles: function () {
      this.toggleInactiveProfiles(false);
    },
    showInactiveProfiles: function () {
      this.toggleInactiveProfiles(true);
    },
    toggleInactiveProfiles: function (showingInactive) {
      dojo.addClass(
        (showingInactive ? this.showInactive : this.hideInactive).domNode, 
        "hidden"
      );
      dojo.removeClass(
        (showingInactive ? this.hideInactive : this.showInactive).domNode, 
        "hidden"
      );
      this.showingInactive = showingInactive;
      qubit.qtag.Dashboard.showingInactive = showingInactive;
      this.updateProfiles();
    },
    updateProfiles: function () {
      qubit.qtag.data.dao.ProfileDAO.getProfiles(
        dojo.hitch(this, this.profilesLoaded)
      );
    },
    profilesLoaded: function (profiles) {
      if (profiles.length === 0) {
        this.createFirstProfile();
      } else {
        this.showProfiles(profiles);
      }
    },
    createFirstProfile: function () {
      qubit.qtag.data.dao.ProfileDAO.createProfile("Default", "", true, false,
        dojo.hitch(this, this.firstProfileCreated));
    },
    firstProfileCreated: function (profile) {
      this.showProfiles([profile]);
    },
    showProfiles: function (profiles) {
      var oneClient, oneProfile, profilesNeededToSave, useage;
      if (!this.showingInactive) {
        profiles = dojo.filter(profiles, function (profile) { 
          return profile.active;
        });
      }
      profiles.sort(function (a, b) {
        if (a.active === b.active) {
          return (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1;
        } else {
          return a.active ? -1 : 1;
        }
      }); 
      profilesNeededToSave = dojo.filter(profiles, function (profile) {
        return (profile.active && profile.needsSaving()) || 
          (profile.invalidationToken > 0);
      });
      
      this.hideSaveProfiles();
      
      this.profileStateManager = new qubit.qtag.ProfileStateManager();
      this.profileStateManager.setProfiles(profiles);
      dojo.connect(this.profileStateManager, "onProfileCommitFinished", this, 
          this.profileCommitFinished);
      
      this.estimateUsage();
      if (profilesNeededToSave.length > 0) {
        this.showSaveProfiles(profilesNeededToSave);
      }
      
      dojo.forEach(this.profileViewers, function (profileViewer, i) {
        dojo.destroy(profileViewer.domNode);
      });
      // create profiles
      
      oneClient = true;
      oneProfile = true;
      if (qubit.OPENTAG_APP.clients &&
              qubit.OPENTAG_APP.clients.length > 1) {
        oneClient = false;
      }
      if (profiles && profiles.length > 1) {
        oneProfile = false;
      }
      
      dojo.forEach(profiles, dojo.hitch(this, function (profile, i) {
        var displayState, profileViewer;
        
        if (qubit.qtag.Dashboard.profileDisplayStates !== undefined) {
          displayState = qubit.qtag.Dashboard.profileDisplayStates[profile.id];
        } else {
          displayState = false;
        }
        
        profileViewer = new qubit.qtag.ProfileViewer({
          profile: profile,
          hideCopyFromMenuItem: (oneClient && oneProfile),
          hideCopyToMenuItem: oneProfile,
          updateProfiles: dojo.hitch(this, this.updateProfiles),
          showingInactive: this.showingInactive,
          profileStateManager: this.profileStateManager,
          isOpen: displayState
        });
        
        profileViewer.placeAt(this.profileContainer);
        this.profileViewers.push(profileViewer);  
        dojo.connect(profileViewer, "onToggleStateChanged", this, 
            this.profileStateChangedHandler);
      }));
    },
    estimateUsage: function () {
      qubit.data.UserManager.getClientDetails().then(
        dojo.hitch(this, this.doEstimateUsage)
      );
    },
    doEstimateUsage: function () {
      var client, end, start;
      client = qubit.data.UserManager.client;
      if (!(client.paymentWhitelisted || client.ccApproved)) {
        end = new Date();
        start = new Date(end.getTime() - (1440 * 60000 * 30));
        qubit.qtag.data.dao.StatsDAO.getClientStats(start, 
            end, qubit.qtag.data.dao.StatsDAO.daily, 
            dojo.hitch(this, this.handleStats));
      }
    },
    handleStats: function (data) {
      var days, daysUsed, rate, estUsage, totalUsage;
      estUsage = this.estimateMonthlyUsage(data);
      totalUsage = this.calcTotalUsage(data);
      daysUsed = this.daysUsed(data);
      rate = estUsage / daysUsed;
      days = Math.floor(1e6 / rate) - daysUsed;
      if (estUsage > 1e6) {
        this.showCreditCardPrompt(totalUsage, days);
      }
      if (totalUsage > 1e6) {
        dojo.addClass(this.notice, "covered");
        dojo.removeClass(this.cover, "hidden");
      }
    },
    calcTotalUsage: function (data) {
      var value = "timesServed", timesServed = 0;
      dojo.forEach(data, function (el) {
        var duration = Math.round((el.end.getTime() - el.start.getTime()) / 
          (24 * 60 * 60 * 1000)); 
        if (el[value] > 1000) {
          timesServed += el[value] / duration;
        } 
      });
      return timesServed;
    },
    estimateMonthlyUsage: function (data) {
      var count = 0, value = "timesServed", timesServed = 0;
      dojo.forEach(data, function (el) {
        var duration = ((el.end.getTime() - el.start.getTime()) / 
          (24 * 60 * 60 * 1000)); 
        if (el[value] > 1000) {
          timesServed += el[value] / duration;
          count += 1;
        } 
      });
      if (count > 0) {
        return (timesServed / count) * 30;
      } else {
        return 0;
      }
    },
    daysUsed: function (data) {
      var value = "timesServed", count = 0;
      dojo.forEach(data, function (el) {
        if (el[value] > 1000) {
          count += 1;
        } 
      });
      return count;
    },
    showCreditCardPrompt: function (usage, days) {
      this.ccPrompt = new qubit.qtag.CreditCardNeeded({
        usage: usage,
        days: days,
        onFinish: dojo.hitch(this, function () {
          dojo.removeClass(this.notice, "covered");
          dojo.addClass(this.cover, "hidden");
        })
      });
      this.ccPrompt.placeAt(this.notice);
    },
    profileCommitFinished: function (savedProfile, pushingToCdn, succeeded) {
      setTimeout(dojo.hitch(this, this.updateProfiles), succeeded ? 1 : 5000);
    },
    profileStateChangedHandler: function (profile, open) {
      qubit.qtag.Dashboard.profileDisplayStates[profile.id] = open;
    },
    showSaveProfiles: function (profiles) {
      this.saveProfiles = new qubit.qtag.SaveProfiles({
        profiles: profiles,
        profileStateManager: this.profileStateManager
      });
      this.saveProfiles.placeAt(this.summary);
      dojo.connect(this.saveProfiles, "onAllProfilesSaved", 
        this, this.savesComplete);
      dojo.connect(this.saveProfiles, "onProfileReverted", 
          this, this.profileReverted);
    },
    savesComplete: function () {
      dojo.destroy(this.saveProfiles.domNode);
    },
    profileReverted: function (obj) {
      this.updateProfiles();
    },
    hideSaveProfiles: function () {
      if (this.saveProfiles) {
        this.saveProfiles.destroy();
        this.saveProfiles = null;
      }
    }
  });

  qubit.qtag.Dashboard.profileDisplayStates = [];
});
//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/qtag/CreateCustomVariable>
//= require <qubit/qtag/CreateScriptLibraryParam>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.ScriptLibraryParam", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      paramValueId: -1,
      templateString: dojo.cache("qtag.templates", 
          "ScriptLibraryParam.html?cb=" + qubit.v),
      postCreate: function () {
        dojo.addClass(this.valueLabel, "color" + this.colorIndex);
        this.populate(this.param);
        dojo.connect(this.editButton, "onClick", this, this.doEdit);
        dojo.connect(this.deleteButton, "onClick", this, this.doDelete);
      },
      populate: function (param) {
        qubit.Util.setText(this.valueLabel, this.param.paramName);
        qubit.Util.setText(this.universalVarName, this.param.valueName);
      },
      doEdit: function () {
        new qubit.qtag.CreateScriptLibraryParam({
          param: this.param,
          universalVars: this.universalVars,
          templateId: this.templateId,
          onSave: dojo.hitch(this, this.doSave)
        }).show();
      },
      doDelete: function () {
        qubit.qtag.data.dao.ScriptTemplateDAO.removeScriptParam(this.templateId,
          this.param.id).then(dojo.hitch(this, this.paramDeleted));
      },
      paramDeleted: function () {
        this.onDelete();
      },
      onDelete: function () {
        
      },
      doSave: function (param) {
        this.param = param;
        this.populate(param);
        this.onSave(param);
      },
      onSave: function () {
        
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/data/Payment>
//= require <qubit/util/Status>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.InlineEditBox");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Textarea");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.PaymentForm", [dijit._Widget, dijit._Templated], {
    widgetsInTemplate: true,
    templateString: dojo.cache("qtag.templates", "PaymentForm.html"),
    postCreate: function () {
      _gaq.push(['_trackPageview', '/PaymentForm']);
      this.inherited(arguments);
      qubit.data.Payment.getCardTypes(dojo.hitch(this, this.showCardTypes));
      qubit.data.Payment.getCountries(dojo.hitch(this, this.showCountries));
      dojo.connect(this.form, "onSubmit", this, this.submitForm);
      dojo.connect(this.individual, 'onClick', this, this.changeType);
      dojo.connect(this.company, 'onClick', this, this.changeType);
      this.changeType();
    },
    changeType: function () {
      if (this.company.checked) {
        dojo.addClass(this.vatNumberHolder, "visible");
      } else {
        dojo.removeClass(this.vatNumberHolder, "visible");
      }
    },
    showCardTypes: function (cardTypes) {
      this.cardTypes = {};
      this.cardType.addOption(dojo.map(cardTypes, dojo.hitch(this, 
        function (cardType) {
          this.cardTypes[cardType.code] = cardType;
          return {
            label: cardType.description,
            value: cardType.code,
            selected: cardType.code === "VISA"
          };
        }
        )));
    },
    showCountries: function (countries) {
      this.country.addOption(dojo.map(countries, function (country) {
        return {
          label: country.name,
          value: country.code
        };
      }));
    },
    submitForm: function (e) {
      this.doneButton.set("disabled", true);
      this.status.hide();
      if (this.form.validate()) {
        var nextMonth, selectedMonth, values = this.form.getValues();
        nextMonth = new Date();
        nextMonth = new Date(nextMonth.getFullYear(), 
          nextMonth.getMonth(), 1);
        selectedMonth = new Date(2000 + parseInt(values.expiryYear, 10), 
          parseInt(values.expiryMonth, 10) - 1, 1);
        if (selectedMonth.getTime() < nextMonth.getTime()) {
          this.status.error("Please enter a date in the future.");
          this.doneButton.set("disabled", false);
        } else {
          qubit.data.Payment.submitPayment(values.name, 
            values.card, 
            values.expiryMonth + values.expiryYear, 
            values.country, values.cardType, 
            (this.company.checked) ? values.vatNumber : "",
            dojo.hitch(this, this.submitFinished));
        }
      } else {
        this.doneButton.set("disabled", false);
      }
      dojo.stopEvent(e);
    },
    submitFinished: function (response) {
      if (response.status === "FAIL") {
        if (response.errorCode === "1600") {
          this.status.error("Your card details seem incorrect. " +
            "Have you made an error entering them in?");
        } else if ((response.errorCode === "1500") || 
            (response.errorCode === "1700")) {
          this.status.error("A problem has occurred at our end. Your details" +
             "haven't been saved and your files cannot be hosted at this" +
             "time.");
        } else if (response.msg !== null) {
          this.status.error(response.msg);
        } else {
          this.status.error("Your credit card information could not be " +
              "checked at this time.");
        }
      } else if (response.status === "OK") {
        qubit.data.UserManager.setHosted();
        this.onPaymentSuccess();
      }
      this.doneButton.set("disabled", false);
    },
    onPaymentSuccess: function () {
      
    }
  });
});
//= require <qubit/GLOBAL>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.TextBox");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.SVSelector", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "SVSelector.html?cb=" + 
          qubit.v),
      firstRowTypes: [
        {
          name: "Time on page (ms)",
          id: "timeOnCurrentPage",
          type: "exact",
          js: "setTimeout(cb, {VAL})"
        },
        {
          name: "UV Event",
          id: "uvEvent",
          type: "event",
          js: "\n  window.uv_listener.push(['on', 'event', function(event){\n" +
            "    if (event {COMP}){\n" +
            "      cb(!{REPEAT});\n" +
            "    }\n" +
            "  }]);\n"
        },
        {
          name: "UV Event with numeric value",
          id: "uvEventNumeric",
          type: "numericevent",
          js: "\n  window.uv_listener.push(['on', 'event', function(event){\n" +
            "    if (event && event.{FIELD}" +
            " && event.{FIELD} {NUMOP} {VAL2}){\n" +
            "      cb(!{REPEAT});\n" +
            "    }\n" +
            "  }]);\n"
        }
      ],
      types: [
        {
          name: "Has cookie",
          id: "cookie",
          type: "cookie",
          js: "(session.getCookie(\"{VAL}\") || \"\")"
        },
        {
          name: "Has numeric cookie",
          id: "numericcookie",
          type: "numericcookie",
          js: "(function(){" +
            "try{" +
            "return parseInt(session.getCookie(\"{VAL}\"),10) {NUMOP} {VAL2}" +
            "}catch(e){" +
            "return false;" +
            "}}())"
        },
        {
          name: "Visit Number",
          id: "visitNumber",
          type: "numeric",
          js: "session.sessionCount {NUMOP} {VAL}"
        },
        {
          name: "Page Views count",
          id: "pageViews",
          type: "numeric",
          js: "session.pageViews {NUMOP} {VAL}"
        },
        {
          name: "Time on site (ms)",
          id: "timeOnSite",
          type: "numeric",
          js: "(new Date().getTime() - session.sessionStartTime) " +
            "{NUMOP} {VAL}"
        },
        {
          name: "Any session referrer",
          id: "sessionReferrer",
          type: "referrer",
          tm: "(function () {" +
              "for (var i = 0, ii = session.referrer.length; i < ii; i += 1){" +
              "  if ({JS}) return true;" +
              "}" +
              "return false" +
              "}())",
          js: "session.referrer[i]"
        },
        {
          name: "First session referrer",
          id: "firstSessionReferrer",
          type: "referrer",
          js: "session.referrer[0]"
        },
        {
          name: "Last session referrer",
          id: "lastSessionReferrer",
          type: "referrer",
          js: "session.referrer[session.referrer.length - 1]"
        },
        {
          name: "Any landing page",
          id: "anyLandingPage",
          type: "landing",
          tm: "(function () {" +
              "for (var i = 0, ii = session.referrer.length; i < ii; i += 1){" +
              "  if ({JS}) return true;" +
              "}" +
              "return false" +
              "}())",
          js: "session.referrer[i]"
        },
        {
          name: "First landing page",
          id: "firstLandingPage",
          type: "landing",
          js: "session.referrer[0]"
        },
        {
          name: "Last landing page",
          id: "lastLandingPage",
          type: "landing",
          js: "session.referrer[session.referrer.length - 1]"
        },
        {
          name: "Current URL",
          id: "currentUrl",
          type: "url",
          js: "document.location.href"
        },
        {
          name: "Page Referrer",
          id: "pageReferrer",
          type: "url",
          js: "document.referrer"
        }
      ],
      numOp: {
        "1": ">",
        "2": ">=",
        "3": "===",
        "4": "!==",
        "5": "<=",
        "6": "<"
      },
      postCreate: function () {
        if (this.first) {
          dojo.addClass(this.domNode, "first");
        }
        this.addTypes(this.firstRow && this.first);
        this.createTypeMap();
        dojo.connect(this.svType, 'onChange', this, 
          this.svTypeSelected);
        dojo.connect(this.cookieValueType, 'onChange', this, 
            this.cookieValueTypeSelected);
        dojo.connect(this.timeComparatorType, 'onChange', this, 
            this.timeComparatorTypeSelected);
        dojo.connect(this.removeButton, 'onclick', this, this.removeElement);
      },
      addTypes: function (addStarters) {
        if (addStarters) {
          // Slice and dice so UV stuff goes at the bottom - Emre's request
          this.svTypes = this.firstRowTypes.slice(0, 1)
            .concat(this.types)
            .concat(this.firstRowTypes.slice(1));
          this.firstType = true;
        } else {
          this.svTypes = this.types.concat([]);
          this.firstType = false;
        }
        this.svType.addOption(dojo.map(this.svTypes, 
          dojo.hitch(this, function (type) {
            return {
              label: type.name,
              value: type.id,
              type: type.type
            };
          })));
      },
      createTypeMap: function () {
        this.typeMap = {};
        dojo.forEach(this.svTypes, dojo.hitch(this, function (type) {
          this.typeMap[type.id] = type;
        }));
      },
      svTypeSelected: function (svType) {
        this.value.set("placeHolder", "");
        this.value2.set("placeHolder", "");
        dojo.addClass(this.numericComparatorHolder, "hidden");
        dojo.addClass(this.stringComparatorHolder, "hidden");
        dojo.addClass(this.cookieValueTypeHolder, "hidden");
        dojo.addClass(this.numericCookieComparatorHolder, "hidden");
        dojo.addClass(this.timeComparatorHolder, "hidden");
        dojo.addClass(this.valueHolder2, "hidden");
        dojo.addClass(this.booleanHolder, "hidden");
        switch (this.typeMap[svType].type) {
        case "numeric":
          dojo.removeClass(this.numericComparatorHolder, "hidden");
          break;
        case "url":
          dojo.removeClass(this.stringComparatorHolder, "hidden");
          break;
        case "referrer":
        case "landing":
          dojo.removeClass(this.stringComparatorHolder, "hidden");
          dojo.removeClass(this.timeComparatorHolder, "hidden");
          if (this.timeComparatorType.getValue() === "2") {
            dojo.removeClass(this.valueHolder2, "hidden");
          }
          break;
        case "cookie":
          dojo.removeClass(this.cookieValueTypeHolder, "hidden");
          break;
        case "numericcookie":
          dojo.removeClass(this.numericCookieComparatorHolder, "hidden");
          dojo.removeClass(this.valueHolder2, "hidden");
          break;
        case "event":
          dojo.removeClass(this.cookieValueTypeHolder, "hidden");
          this.value.set("placeHolder", "Event Key");
          this.value2.set("placeHolder", "Key Value");
          dojo.removeClass(this.booleanHolder, "hidden");
          break;
        case "numericevent":
          dojo.removeClass(this.numericCookieComparatorHolder, "hidden");
          this.value.set("placeHolder", "Event Key");
          this.value2.set("placeHolder", "Key Value");
          dojo.removeClass(this.valueHolder2, "hidden");
          dojo.removeClass(this.booleanHolder, "hidden");
          break;
        }
        this.onTypeChange(this);
      },
      onTypeChange: function () {
        
      },
      cookieValueTypeSelected: function (type) {
        if (parseInt(type, 10) > 0) {
          dojo.removeClass(this.valueHolder2, "hidden");
        } else {
          dojo.addClass(this.valueHolder2, "hidden");
        }
        this.onTypeChange();
      },
      timeComparatorTypeSelected: function (type) {
        if (parseInt(type, 10) > 1) {
          dojo.removeClass(this.valueHolder2, "hidden");
        } else {
          dojo.addClass(this.valueHolder2, "hidden");
        }
        this.onTypeChange();
      },
      removeElement: function () {
        this.removed();
      },
      removed: function () {
      },
      isStarterBased: function () {
        var selectedValue = this.svType.getValue();
        return dojo.some(this.firstRowTypes, function (x) {
          return x.id === selectedValue;
        });
      },
      getJs: function () {
        var js, svType, comp;
        svType = this.svType.getValue();
        js = this.typeMap[svType].js;
        switch (this.typeMap[svType].type) {
        case "exact":
          js = js.replace("{VAL}", this.value.getValue());
          break;
        case "numeric":
          js = js.replace("{NUMOP}", 
            this.numOp[this.numericComparator.getValue()]);
          js = js.replace("{VAL}", this.value.getValue());
          break;
        case "url":
          js = this.processString(js, this.stringComparator.getValue(),
            this.value.getValue());
          break;
        case "referrer":
          js = this.getJsFromReferrerArray(js, svType, "url", 
              this.typeMap[svType].id === "sessionReferrer");
          break;
        case "landing":
          js = this.getJsFromReferrerArray(js, svType, "landing", 
              this.typeMap[svType].id === "anyLandingPage");
          break;
        case "cookie":
          js = js.replace("{VAL}", this.value.getValue());
          js = this.processString(js, this.cookieValueType.getValue(),
            this.value2.getValue());
          break;
        case "numericcookie":
          js = js.replace("{VAL}", this.value.getValue());
          js = js.replace("{NUMOP}",
              this.numOp[this.numericCookieComparator.getValue()]);
          js = js.replace("{VAL2}", this.value2.getValue());
          break;
        case "event":
          //Prevent repetition if "any value" is selected.
          if (parseInt(this.cookieValueType.getValue(), 10) !== 0) {
            comp = "event." + this.value.getValue();
            js = js.replace("{COMP}",
              "&& event." + this.value.getValue() + " && " +
              this.processString(comp, this.cookieValueType.getValue(),
                this.value2.getValue()));
          } else {
            js = js.replace("{COMP}", " && event." + this.value.getValue());
          }
          js = js.replace(/\{REPEAT\}/g, this.booleanValue.getValue());
          break;
        case "numericevent":
          js = js.replace(/\{FIELD\}/g, this.value.getValue());
          js = js.replace("{NUMOP}", 
              this.numOp[this.numericCookieComparator.getValue()]);
          js = js.replace("{VAL2}", this.value2.getValue());
          js = js.replace(/\{REPEAT\}/g, this.booleanValue.getValue());
          break;
        }
        if (this.isStarterBased()) {
          //js becomes simply function contents, doesn't need brackets
          return js;
        } else {
          //js becomes "return js" so we force it to be a single expression
          return "(" + js + ")";
        }
      },
      getJsFromReferrerArray: function (js, svType, type, usesAny) {
        js = this.processString(js + "." + type, 
            this.stringComparator.getValue(), this.value.getValue());
        if (this.timeComparatorType.getValue() === "2") {
          js = "(" + js + ") && (" + this.typeMap[svType].js + 
            ".time > new Date().getTime() - " + 
            this.value2.getValue() + " * 60000)";
        }
        if (usesAny) {
          js = this.typeMap[svType].tm.replace("{JS}", js);
        }
        return js;
      },
      processString: function (js, type, value) {
        switch (type) {
        case "1":
          js = js + " === \"{VAL}\"";
          break;
        case "2":
          js = js + " !== \"{VAL}\"";
          break;
        case "3":
          js = js + ".indexOf && " + js + ".indexOf(\"{VAL}\") >= 0";
          break;
        case "4":
          js = js + ".indexOf && " + js + ".indexOf(\"{VAL}\") === -1";
          break;
        case "5":
          js = "new RegExp(\"^{VAL}\").test(" + js + ")";
          break;
        case "6":
          js = "!new RegExp(\"^{VAL}\").test(" + js + ")";
          break;
        case "7":
          js = "new RegExp(\"{VAL}$\").test(" + js + ")";
          break;
        case "8":
          js = "!new RegExp(\"{VAL}$\").test(" + js + ")";
          break;
        case "9":
          js = "new RegExp(\"{VAL}\").test(" + js + ")";
          break;
        }
        js = js.replace("{VAL}", value);
        return js;
      },
      getDescriptor: function () {
        var descriptor, svType, dojoBool;
        descriptor = {};
        svType = this.svType.getValue();
        descriptor.type = svType;
        switch (this.typeMap[svType].type) {
        case "exact":
          descriptor.comparator = 2;
          descriptor.value = this.value.getValue();
          break;
        case "numeric":
          descriptor.comparator = this.numericComparator.getValue();
          descriptor.value = this.value.getValue();
          break;
        case "url":
          descriptor.comparator = this.stringComparator.getValue();
          descriptor.value = this.value.getValue();
          break;
        case "referrer":
        case "landing":
          descriptor.comparator = [
            parseInt(this.stringComparator.getValue(), 10), 
            parseInt(this.timeComparatorType.getValue(), 10)
          ];
          descriptor.value = [this.value.getValue(), this.value2.getValue()];
          break;
        case "cookie":
          descriptor.comparator = this.cookieValueType.getValue();
          descriptor.value = [this.value.getValue(), this.value2.getValue()];
          break;
        case "numericcookie":
          descriptor.comparator = this.numericCookieComparator.getValue();
          descriptor.value = [this.value.getValue(), this.value2.getValue()];
          break;
        case "event":
          descriptor.comparator = this.cookieValueType.getValue();
          descriptor.value = [this.value.getValue(), this.value2.getValue()];
          dojoBool = this.booleanValue.getValue();
          //Dojo gives a string if true and a boolean if false,
          // make it always boolean
          if (dojoBool) {
            descriptor.bool = true;
          } else {
            descriptor.bool = false;
          }
          break;
        case "numericevent":
          descriptor.comparator = this.numericCookieComparator.getValue();
          descriptor.value = [this.value.getValue(), this.value2.getValue()];
          dojoBool = this.booleanValue.getValue();
          //Dojo gives a string if true and a boolean if false,
          // make it always boolean
          if (dojoBool) {
            descriptor.bool = true;
          } else {
            descriptor.bool = false;
          }
          break;
        }
        return descriptor;
      },
      setValue: function (descriptor) {
        if (descriptor.type === "landingUrl") {
          this.svType.setValue("lastLandingPage");
        } else {
          this.svType.setValue(descriptor.type);
        }
        switch (this.typeMap[descriptor.type].type) {
        case "exact":
          this.value.setValue(descriptor.value);
          break;
        case "numeric":
          this.numericComparator.setValue(descriptor.comparator);
          this.value.setValue(descriptor.value);
          break;
        case "url":
          this.stringComparator.setValue(descriptor.comparator);
          this.value.setValue(descriptor.value);
          break;
        case "referrer":
        case "landing":
          this.stringComparator.setValue(descriptor.comparator[0]);
          this.timeComparatorType.setValue(descriptor.comparator[1]);
          this.value.setValue(descriptor.value[0]);
          this.value2.setValue(descriptor.value[1]);
          break;
        case "cookie":
          this.cookieValueType.setValue(descriptor.comparator);
          this.value.setValue(descriptor.value[0]);
          this.value2.setValue(descriptor.value[1]);
          break;
        case "event":
          this.cookieValueType.setValue(descriptor.comparator);
          this.value.setValue(descriptor.value[0]);
          this.value2.setValue(descriptor.value[1]);
          this.booleanValue.setValue(descriptor.bool);
          break;
        case "numericcookie":
          this.numericCookieComparator.setValue(descriptor.comparator);
          this.value.setValue(descriptor.value[0]);
          this.value2.setValue(descriptor.value[1]);
          break;
        case "numericevent":
          this.numericCookieComparator.setValue(descriptor.comparator);
          this.value.setValue(descriptor.value[0]);
          this.value2.setValue(descriptor.value[1]);
          this.booleanValue.setValue(descriptor.bool);
          break;
        }
      },
      update: function (alone, isFirst) {
        if (alone && isFirst) {
          dojo.addClass(this.removeButton, "hideRemover");
        } else {
          dojo.removeClass(this.removeButton, "hideRemover");
        }
        if (isFirst && !this.firstType) {
          this.makeFirst();
        }
      },
      makeFirst: function () {
        var descriptor = this.getDescriptor();
        this.firstType = true;
        this.createTypeMap();
        while (this.svType.options.length > 0) {
          this.svType.removeOption(0);
        }
        this.addTypes(true);
        this.setValue(descriptor);
      },
      validateForm: function () {
        try {
          switch (this.typeMap[this.svType.getValue()].type) {
          case "exact":
            return this.isGoodNumber(this.value.getValue());
          case "numeric":
            return this.isGoodNumber(this.value.getValue());
          case "url":
            return this.value.getValue().length > 0;
          case "referrer":
          case "landing":
            return this.value.getValue().length > 0 && 
              ((parseInt(this.timeComparatorType.getValue(), 10) === 1) || 
              (this.isGoodNumber(this.value2.getValue())));
          case "cookie":
          case "event":
            return (this.value.getValue().length > 0) && 
              ((parseInt(this.cookieValueType.getValue(), 10) === 0) || 
              (this.value2.getValue().length > 0));
          case "numericcookie":
          case "numericevent":
            return (this.value.getValue().length > 0) && 
              this.isGoodNumber(this.value2.getValue());
          }
        } catch (e) {
          return false;
        }
      },
      isGoodNumber: function (x) {
        //From MDN. Anything that passes this can be used in arithmetic
        if (/^\-?([0-9]+(\.[0-9]+)?|Infinity)$/.test(x)) {
          return true;
        } else { 
          return false;
        }
      }
      
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/data/dao/VendorDAO>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Button");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CreateVendor", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Create Vendor",
      templateString: dojo.cache("qtag.templates", 
          "CreateVendor.html?cb=" + qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Create Vendor"
        });
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        dojo.connect(this.form, "onSubmit", this, this.submitForm);
        dojo.connect(this.cancel, "onClick", this, this.hide);
        if (this.vendor) {
          this.populate(this.vendor);
        }
        dojo.connect(this.varType, "onChange",  this, this.varTypeSelected);
      },
      populate: function (vendor) {
        this.nameField.setValue(vendor.name);
        this.descriptionField.setValue(vendor.description); 
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
        dojo.style(this.popup.domNode, {
          top: "100px"
        });
      },
      hide: function () {
        this.popup.destroy();
      },
      submitForm: function (e) {
        dojo.stopEvent(e);
        if (this.form.validate()) {
          if (!this.vendor) {
            qubit.qtag.data.dao.VendorDAO.addVendor(
              this.nameField.getValue(),
              this.descriptionField.getValue(),
              this.imageUrlField.getValue()
            ).then(dojo.hitch(this, this.vendorSaved));
          } else {
            qubit.qtag.data.dao.VendorDAO.saveVendor(
              this.vendor.id,
              this.nameField.getValue(),
              this.descriptionField.getValue(),
              this.imageUrlField.getValue()
            ).then(dojo.hitch(this, this.vendorSaved));
          }
        }
      },
      vendorSaved: function (vendor) {
        this.onSave(vendor);
        this.hide();
      },
      onSave: function (vendor) {
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/ScriptChooser>
//= require <qubit/qtag/data/dao/ProfileDAO>
//= require <qubit/qtag/data/dao/ScriptDAO>
//= require <qubit/qtag/MoveScript>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.Select");
dojo.require("dojo.DeferredList");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.MoveSingleScript", 
    [qubit.qtag.MoveScript], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "MoveScripts.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Copy to"
        });
        this.inherited(arguments);
      },
      postCreate: function () {
        _gaq.push(['_trackPageview', '/MoveScript']);
        this.inherited(arguments);
        dojo.connect(this.otherProfiles, "onChange", this, 
            this.profileSelected);
        dojo.connect(this.saveButton, "onClick", this, 
            this.saveButtonClicked);
        dojo.connect(this.copyDeps, "onClick", this, this.copyDepsClicked);  
        if (this.script.parentDependencies.length === 0) {
          dojo.addClass(this.copyDepsHolder, "hidden");
        }
        this.populateProfileDropDown();

        dojo.addClass(this.otherAccounts.domNode, "hidden");
        dojo.addClass(this.scriptFromSelection.domNode, "hidden");
      },
      populateProfileDropDown: function () {
        qubit.qtag.data.dao.ProfileDAO.getProfiles(
          dojo.hitch(this, this.doPopulateProfileDropDown)
        );
      },
      doPopulateProfileDropDown: function (profiles) {
        profiles = dojo.filter(profiles, this.createProfileFilter());
        profiles.sort(function (a, b) {
          return (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1;
        });
        if (!profiles || profiles.length === 0) {
          profiles = [{name: "[ no profiles to be selected ]", id: "none"}];
        }
        this.otherProfiles.addOption(dojo.map(profiles, function (profile) {
          return {
            label: profile.name,
            value: profile.id
          };
        }));
      },
      createProfileFilter: function () {
        var thisProfile = this.profile;
        return function (otherProfile) {
          return otherProfile.active && (otherProfile.id !== thisProfile.id); 
        };
      },
      profileSelected: function (profileId) {
        qubit.qtag.data.dao.ScriptDAO.getScripts(profileId, 
          dojo.hitch(this, this.scriptsLoaded));
      },
      scriptsLoaded: function (scripts) {
        this.existingScripts = scripts;
        this.updateText();
      },
      
      copyDepsClicked: function () {
        this.updateText();
      },
      updateText: function () {
        var text, exists, scriptNames = [];
        text = "This container has " + this.existingScripts.length + 
          " scripts. ";
        exists = this.doesScriptExist(this.existingScripts);
        if (exists) {
          text += 'The existing script with the same name will be overwritten.';
        }
        if (this.copyDeps.checked &&
                (this.script.parentDependencies.length > 0)) {
          dojo.forEach(this.script.parentDependencies, 
            dojo.hitch(this, function (scriptId) {
              scriptNames.push(this.scripts[scriptId]);
            }));
          text += "The following scripts will also be copied, " +
            "as they are dependencies: " + 
            _.pluck(scriptNames, "name").join(",");
        }
        qubit.Util.setText(this.profileInfo, text);
      },
      saveButtonClicked: function () {
        this.saveButton.set("disabled", true);
        var fromProfileId, toProfileId;
        fromProfileId = this.profile.id;
        toProfileId = this.otherProfiles.getValue();
        qubit.qtag.data.dao.ScriptDAO.getScript(this.profile.id, 
            this.script.filterGroupId, this.script.id)
          .then(dojo.hitch(this, function (script) {
            this.moveScript(script, fromProfileId, toProfileId, 
              this.copyDeps.checked);
          }));
      },
      doesScriptExist: function (scripts) {
        var script, existing;
        script = this.script;
        dojo.some(scripts, dojo.hitch(this, function (s) {
          if (s.name === this.script.name) {
            existing = s;
          }
          return !!existing;
        }));
        return existing;
      },
      moveComplete: function (toProfileId) {
        this.checkConsent(toProfileId);
        this.hide();
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
      },
      hide: function () {
        this.popup.destroy();
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/CreateScript>
//= require <qubit/qtag/PageVariables>
//= require <qubit/widget/SaveHistory>

/*global qubit */ 
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag._WindowManager", null, {
    addScript: function (profile, script) {
      this.showWidget(qubit.qtag.CreateScript, {
        profile: profile,
        script: script
      });
    },
    showPageVariables: function (profile) {
      this.showWidget(qubit.qtag.PageVariables, {
        profile: profile
      });
    },
    showSaveHistory: function (profile) {
      if (this.saveHistory) {
        this.saveHistory.destroy();
      }
      
      this.showWidget(null);

      this.saveHistory = new qubit.widget.SaveHistory({
        parentContainer: this.tabs[0].domNode.childNodes[0],
        profileId: profile.id,
        displayRange: 12
      });
    },
    showDashboard: function () {
      this.showWidget(qubit.qtag.Dashboard);
    },
    showScriptLibrary: function (template) {
      this.tabs[2].controller.selectChild(this.tabs[2].id);
      this.tabs[2].showTemplatedScript(template);
    },
    showWidget: function (Widget, args) {
      var parent, widget;
      parent = this.tabs[0].domNode.childNodes[0];
      if (parent.childNodes && parent.childNodes[0]) {
        dojo.destroy(parent.childNodes[0]);
      }
      if (Widget) {
        widget = new Widget(args);
        widget.placeAt(parent);
        widget.startup();
      }
      this.tabs[0].controller.selectChild(this.tabs[0].id);
    },
    setTabs: function (tabs) {
      this.tabs = tabs;
    }
  });
  qubit.qtag.WindowManager = new qubit.qtag._WindowManager();
});
//= require <qubit/GLOBAL>
//= require <qubit/Util>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.ScriptIcon", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "ScriptIcon.html?cb=" + 
          qubit.v),
      postCreate: function () {
        
        this.inherited(arguments);
        
        if (!this.script.isOneVersionOnly &&
                this.script.version !== "backport") {
          var vname = this.script.version.replace(/\._(\d)/g, ".$1");
          qubit.Util.setText(this.version, " ( " + vname + " )");
          dojo.addClass(this.version, " show");
        }
        
        qubit.Util.setText(this.textHolder, this.script.name);
        qubit.Util.setText(this.description, this.script.description);
        dojo.connect(this.textHolder, "onclick", this, this.selectCell);
        dojo.connect(this.description, "onclick", this, this.selectCell);
        dojo.connect(this.selector, "onClick", this, this.selectCell);
      },
      selectCell: function (cell) {
        dojo.addClass(this.domNode, "selected");
        this.onSelect(this);
      },
      unselectCell: function () {
        dojo.removeClass(this.domNode, "selected");
      },
      onSelect: function () {
        
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/util/MultiSelect>
//= require <qubit/qtag/ScriptChooser>
//= require <qubit/qtag/CreateFilter>
//= require <qubit/qtag/WindowManager>
//= require <qubit/qtag/TemplateDetailView>
//= require <qubit/qtag/ParamValueInput>
//= require <qubit/qtag/RequestScript>
//= require <qubit/qtag/data/dao/ScriptDAO>
//= require <qubit/qtag/data/dao/FilterDAO>
//= require <qubit/qtag/data/dao/CategoryDAO>
//= require <qubit/qtag/data/dao/CustomVarDAO>
//= require <qubit/qtag/data/dao/ScriptTemplateDAO>
//= require <qubit/qtag/EditConsent>
//= require <qubit/qtag/data/dao/ConsentDAO>
//= require <qubit/qtag/PreviewConsent>
//= require <qubit/qtag/CustomScriptParam>
//= require <qubit/qtag/CreateCustomScriptParam>
//= require <qubit/JSValidator>
//= require <qubit/NotificationManager>
//= require <qubit/widget/base/Function>
//= require <qubit/widget/base/Log>
//= require <qubit/qtag/ui/TagAccessorStringDialog>
//= require <qubit/qtag/ui/DisableABTestsPrompt>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.Textarea");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.DateTextBox");

dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dojo.dnd.Source");
dojo.require("dojox.form.BusyButton");
dojo.require("dojox.grid.EnhancedGrid");
dojo.require("dojox.grid.enhanced.plugins.DnD");

dojo.addOnLoad(function () {
  
  var NOTIFICATIONS, log, DEFAULT_TIMEOUT = 5 * 1000, SECOND = 1000;
  var TagAccessorStringDialog = qubit.qtag.ui.TagAccessorStringDialog;
  var DisableABTestsPrompt = qubit.qtag.ui.DisableABTestsPrompt;
  
  log = new qubit.widget.base.Log("CreateScript: ");
  
  dojo.declare("qubit.qtag.CreateScript",
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      useDragDrop: false,
      templateString: dojo.cache("qtag.templates", "CreateScript.html?cb=" + 
          qubit.v),
      filters: [],
      deletedFilters: [],
      postCreate: function () {
        this.inherited(arguments);
        dojo.connect(this.cancelButton, "onClick", this, this.cancel);
        dojo.connect(this.form, "onSubmit", this, this.submitForm);
        dojo.connect(this.requestScriptButton, "onClick",
          this, this.requestScript);
        dojo.connect(this.templatedScript, 'onClick', this, this.changeType);
        dojo.connect(this.customScript, 'onClick', this, this.changeType);
        dojo.connect(this.filterTestButton, 'onClick', this, this.testFilters);
        dojo.connect(this.filterTest, "onKeyPress", this,
            this.preventSubmitAndTest);

        dojo.connect(this.advancedChoiceHolder, "onclick",
          this, this.toggleAdvanced);
        dojo.connect(this.createFilterButton, "onClick", this,
          this.showCreateFilterDialogue);

        dojo.connect(this.editConsentButton, "onClick", this,
          this.showCreateEditConsent);

        dojo.connect(this.previewConsentButton, "onClick", this,
          this.showConsentPreviewWindow);

        dojo.connect(this.needsConsent, "onClick", this,
            this.confirmConsent);
        
        dojo.connect(this.async, "onClick", this,
            this.asyncClicked);
        dojo.connect(this.usesDocWrite, "onClick", this,
            this.asyncClicked);

        dojo.connect(this.url, "onClick", this,
          this.changeScriptSource);
        dojo.connect(this.html, "onClick", this,
          this.changeScriptSource);
        dojo.connect(this.addVariableButton, "onClick", this,
            this.addPageVariable);
        
        dojo.connect(this.urlText, "onChange", this, this.checkTokens);
        dojo.connect(this.urlText, "onKeyUp", this, this.checkTokens);
        
        dojo.connect(this.preText, "onChange", this, this.checkTokens);
        dojo.connect(this.preText, "onKeyUp", this, this.checkTokens);
        
        dojo.connect(this.postText, "onChange", this, this.checkTokens);
        dojo.connect(this.postText, "onKeyUp", this, this.checkTokens);

        dojo.connect(this.htmlText, "onChange", this, this.checkTokens);
        dojo.connect(this.htmlText, "onKeyUp", this, this.checkTokens);

        dojo.connect(this.location, "onChange", this, this.showLocationDetail);
          
        dojo.addClass(this.scriptTypeHolder, "scriptTypeHolder");
        
        this.JSValidator = qubit.DefaultJSValidatorInstance;
        
        if (qubit.data.UserManager.client.paymentWhitelisted) {
          this.checkedHandler = function (state) {
            if (state) {
              var promp = new DisableABTestsPrompt({
                disableAction: function () {
                  this.abTestCheckbox.setChecked(false);
                  this.validateStringAccessorCheckbox();
                }.bind(this),
                cancelAction: function () {
                  this.abTestCheckbox.setChecked(true);
                  this.validateStringAccessorCheckbox();
                }.bind(this)
              });
              promp.paint();
            } else {
              this.abTestCheckbox.setChecked(true);
              this.validateStringAccessorCheckbox();
              this.showStringAccessorDialog();
            }
          }.bind(this);
          
          this.abTestCheckboxText.onclick = function () {
            this.checkedHandler(this.abTestCheckbox.checked);
          }.bind(this);
          this.abTestCheckbox.domNode.onclick = function () {
            this.checkedHandler(!this.abTestCheckbox.checked);
          }.bind(this);
        } else {
          
          dojo.addClass(this.abTestsNode, "hidden");
        }
      
        dojo.connect(this.stringAccessorButton, "onClick", this,
          this.showStringAccessorDialog);
        
        this.htmlSourceHolderPopupCheckboxInput.onclick = 
          dojo.hitch(this, function (e) {
            this.validationPopups = !this.validationPopups;
            this.checkHtmlFieldForErrors();
          });
        
        this.prePostPopupCheckboxInput.onclick = 
          dojo.hitch(this, function (e) {
            this.validationPrePostPopups = !this.validationPrePostPopups;
            this.checkPrePostForErrors();
          });
        
        this.initializePageVariables();
        
        NOTIFICATIONS = NOTIFICATIONS || new qubit.NotificationManager({
          maxTime: 20 * SECOND
        });
        
        var timeoutValue = this.script ? this.script.scriptTimeout : null;
        
        if (timeoutValue <= 0 || timeoutValue === null) {
          timeoutValue = DEFAULT_TIMEOUT;
        }
        
        this.scriptTimeout.setValue(timeoutValue);
      },
      
      
      /**
       * Page variables initialisation trigger, it will call onVariablesReady 
       * when variables are initialised.
       */
      initializePageVariables: function () {
        qubit.qtag.data.dao.CustomVarDAO.getCustomVariables(this.profile.id)
          .then(dojo.hitch(this, this.onVariablesReady));
      },
      
      showStringAccessorDialog: function () {
        var masterId = null, name = null;
        if (this.script) {
          masterId = this.script.masterId;
          name = this.script.name;
        }
        var popup = new TagAccessorStringDialog({
          tagMasterId: masterId,
          tagName: name
        });
        popup.paint();
        popup.show();
      },
      
      /**
       * The page rendering and script descriptors may depend on custom 
       * variables which depend on other remote services.
       * Page is ready when they are loaded. This is the callback where 
       * dependencies are executed.
       */
      onVariablesReady: function (customVars) {
        this.drawDependencies();
        this.setupAdvancedTabs();
        this.customParams = [];
        this.deletedParams = [];
        this.customVars = customVars;
        this.populateCustomParams();

        if (!this.script) {
          _gaq.push(['_trackPageview', '/ScriptCreate']);
          this.setupNewScript();
        } else {
          _gaq.push(['_trackPageview', '/ScriptEdit']);
          this.showScript();
        }
        dojo.subscribe("logo/clicked", this, function () {
          this.close();
        });
        qubit.qtag.data.dao.ConsentDAO.findOrCreateConsentScript(
          this.profile.id,
          function () {}
        );
        
        //comment out two lines below to bring back classical textareas as 
        //editing fields for html area and pre/post scripts.
        this.applyFormattingForPrePostEditors();
        this.applyFormattingForHtmlEditor();
      },
      drawDependencies: function () {
        this.dependenciesSelector = new qubit.util.MultiSelect({
          unselectedHeadingText: "Available Scripts",
          selectedHeadingText: "Dependencies",
          unselected: [
          ],
          selected: [
          ]
        }).placeAt(this.dependenciesHolder);
      },
     /**
       * Function applying CodeMirror formatter to htmlText object (the html 
       * editor area) used for html fragments editing.
       * @see http://codemirror.net/doc/manual.html for details.
       */
      applyFormattingForHtmlEditor: function () {
        var callback, 
          CodeMirror = window.CodeMirror,
          config = {
            lineNumbers: true,
            mode: "text/html",
            tabMode: "indent"
          };
        
        this.htmlTextCMEditor  = 
          CodeMirror.fromTextArea(this.htmlText.domNode, config);
        
        //refreshing at real time DOM appearance is important
        this.htmlText.startup = dojo.hitch(this, this.refreshHtmlTextCMEditor);
        
        callback = dojo.hitch(this, this.htmlTextareasUpdater);
        CodeMirror.on(this.htmlTextCMEditor, "change", callback);
      },
      /**
       * CodeMirror editors need refreshing for each DOM resizing operation.
       * This is a function for HtmlText editor object refreshing.
       */
      refreshHtmlTextCMEditor: function () {
        if (this.htmlTextCMEditor) {
          this.htmlTextCMEditor.refresh();
        }
      },
      /**
       * Handler used to synchronise CodeMirror editor field of html area
       * with generic textarea element used to read data.
       */
      htmlTextareasUpdater: function () {
        this.htmlText.setValue(this.htmlTextCMEditor.getValue());
        this.checkTokens();
        this.checkHtmlFieldForErrors();
      },
      checkHtmlFieldForErrors: function () {
        var processedHTML, errors;

        processedHTML = this.processStringWithCurrentTokens(
          this.htmlText.getValue()
        );
        
        errors = this.JSValidator
          .validateHTMLForJavaScript(processedHTML, !this.validationPopups);
          
        if (errors) {
          this.htmlSourceHolderNotification.innerHTML = 
            this.JSValidator.getFormattedMessage(errors);
        } else {
          this.htmlSourceHolderNotification.innerHTML = 
            "<div class='msg'>No scripts detected.</div>";
        }
        if (errors && errors.critical) {
          this.criticalHTMLErrors = true; 
        } else {
          this.criticalHTMLErrors = false;
        }
      },
      /**
       * Function applying CodeMirror formatter to preText and postText 
       * textarea nodes used for scripts editing.
       * @see http://codemirror.net/doc/manual.html for details.
       */
      applyFormattingForPrePostEditors: function () {
        var callback, 
          CodeMirror = window.CodeMirror,
          config = {
            lineNumbers: true,
            mode: "text/javascript",
            tabMode: "indent"
          };
        
        this.preCMEditor  = 
          CodeMirror.fromTextArea(this.preText.domNode, config);
        this.postCMEditor = 
          CodeMirror.fromTextArea(this.postText.domNode, config);
        
        //refreshing at real time DOM appearance is important
        this.preText.startup = dojo.hitch(this, this.refreshPreCMEditor);
        this.postText.startup = dojo.hitch(this, this.refreshPostCMEditor);

        callback = dojo.hitch(this, this.prePostTextareasUpdater);
        
        CodeMirror.on(this.preCMEditor, "change", callback);
        CodeMirror.on(this.postCMEditor, "change", callback);
      },
      
      processStringWithCurrentTokens: function (string) {
        var i = 0;
        for (i = 0; i < this.customParams.length; i += 1) {
          string = string
            .replace(new RegExp("\\${" + this.customParams[i].token + "}", "g"),
              "window.qubit_token_value_" + new Date().valueOf());
        }
        return string;
      },
      
      checkPrePostForErrors: function () {
        var errors, preCMEditorValue, postCMEditorValue;
        
        if (this.preCMEditor && this.postCMEditor) {
          preCMEditorValue = this.processStringWithCurrentTokens(
            this.preCMEditor.getValue()
          );
          postCMEditorValue = this.processStringWithCurrentTokens(
            this.postCMEditor.getValue()
          );

          errors = this.JSValidator.validateScripts([
            preCMEditorValue,
            postCMEditorValue
          ], !this.validationPrePostPopups);
          
          if (errors) {
            this.prePostNotification.innerHTML = 
              this.JSValidator.getFormattedMessage(errors);
          } else {
            this.prePostNotification.innerHTML = 
              "<div class='msg'>No scripts detected.</div>";
          }
          if (errors && errors.critical) {
            this.criticalPrePostErrors = true;
          } else {
            this.criticalPrePostErrors = false;
          }
        }
      },
      
      /**
       * CodeMirror editors need refreshing for each DOM resizing operation.
       * This is a function for pre script editor object refreshing.
       */
      refreshPreCMEditor: function () {
        if (this.preCMEditor) {
          this.preCMEditor.refresh();
        }
      },
      /**
       * CodeMirror editors need refreshing for each DOM resizing operation.
       * This is a function for post script editor object refreshing.
       */
      refreshPostCMEditor: function () {
        if (this.postCMEditor) {
          this.postCMEditor.refresh();
        }
      },
      /**
       * Handler used to synchronise CodeMirror editor field of pre and post
       * script editing area with corresponding generic textarea element used to
       * read data.
       */
      prePostTextareasUpdater: function () {
        this.preText.setValue(this.preCMEditor.getValue());
        this.postText.setValue(this.postCMEditor.getValue());
        this.checkTokens();
        this.checkPrePostForErrors();
      },
      setupAdvancedTabs: function () {
        dojo.connect(this.settingsOption, "onclick", 
            this, this.showOption("settings"));
        dojo.connect(this.filterOption, "onclick", 
            this, this.showOption("filter"));
        dojo.connect(this.prePostOption, "onclick", 
            this, this.showOption("prePost"));
        dojo.connect(this.paramsOption, "onclick", 
            this, this.showOption("params"));
        dojo.connect(this.dependenciesOption, "onclick", 
            this, this.showOption("dependencies"));
        this.showOption("settings").apply(this);
      },
      showPrePost: function (shouldShow) {
        this._showPrePost = shouldShow;
        if (shouldShow) {
          dojo.removeClass(this.prePostOption, "hidden");
          dojo.removeClass(this.advancedFeaturesHolder, "FourTabs");
        } else {
          dojo.addClass(this.prePostOption, "hidden");
          dojo.addClass(this.advancedFeaturesHolder, "FourTabs");
          if (this.lastOption === "prePost") {
            this.showOption("settings").apply(this);
          }
        }
        this.setTabWidth();
      },
      showCustomScriptParameters: function (shouldShow) {
        this._showCustomScriptParameters = shouldShow;
        if (shouldShow) {
          dojo.removeClass(this.paramsOption, "hidden");
        } else {
          dojo.addClass(this.paramsOption, "hidden");
          if (this.lastOption === "params") {
            this.showOption("settings").apply(this);
          }
        }
        this.setTabWidth();
      },
      setTabWidth: function () {
        if (this._showPrePost && this._showCustomScriptParameters) {
          dojo.removeClass(this.advancedFeaturesHolder, "FourTabs");
          dojo.removeClass(this.advancedFeaturesHolder, "ThreeTabs");
        } else if (this._showPrePost || this._showCustomScriptParameters) {
          dojo.addClass(this.advancedFeaturesHolder, "FourTabs");
          dojo.removeClass(this.advancedFeaturesHolder, "ThreeTabs");
        } else {
          dojo.removeClass(this.advancedFeaturesHolder, "FourTabs");
          dojo.addClass(this.advancedFeaturesHolder, "ThreeTabs");
        }
      },
      lastOption: null,
      showOption: function (section) {
        return function () {
          if (this.lastOption) {
            dojo.addClass(this[this.lastOption + "Holder"], "hidden");
            dojo.removeClass(this[this.lastOption + "Option"], "selected");
          }
          dojo.removeClass(this[section + "Holder"], "hidden");
          dojo.addClass(this[section + "Option"], "selected");
          this.lastOption = section;
          
          if ((section === "filter") && !this.filtersDrawn) {
            this.createFilterGrid();
            this.filtersDrawn = true;
          }

          if (section === "prePost") {
            this.refreshPreCMEditor();
            this.refreshPostCMEditor();
          }
          this.checkPrePostForErrors();
        };
      },
      addPageVariable: function () {
        new qubit.qtag.CreateCustomScriptParam({
          profileId: this.profile.id,
          customVars: this.customVars,
          onSave: dojo.hitch(this, this.customParamCreated)
        }).show();
      },
      newParamId: 1,
      customParamCreated: function (customParam) {
        customParam.newParamId = this.newParamId;
        this.newParamId += 1;
        this.customParams.push(customParam);
        customParam.view = new qubit.qtag.CustomScriptParam({
          customParam: customParam,
          customVars: this.customVars,
          onUpdate: dojo.hitch(this, this.newCustomParamUpdated),
          onDelete: dojo.hitch(this, this.customParamDeleted)
        }).placeAt(this.pageVariablesHolder);
        dojo.removeClass(this.pageVariablesHolder, "hidden");
        this.checkTokens();
        this.checkHtmlFieldForErrors();
        this.checkPrePostForErrors();
      },
      checkTokens: function () {
        
        var html, url, pre, post;
        if (this.url.checked) {
          url = this.urlText.getValue();
          pre = this.preText.getValue();
          post = this.postText.getValue();
          html = "";
        } else {
          url = "";
          pre = "";
          post = "";
          html = this.htmlText.getValue();
        }
        dojo.forEach(this.customParams, function (customParam) {
          customParam.view.checkForTokens([html, url, pre, post]);
        });
      },
      newCustomParamUpdated: function (customParam) {
        var found, updateParam;
        updateParam = function (params, i, customParam, view) {
          params[i] = customParam;
          params[i].view = view;
        };
        found = _.find(this.customParams, dojo.hitch(this, function (cp, i) {
          if (cp.id) {
            if (cp.id === customParam.id) {
              updateParam(this.customParams, i, customParam, cp.view);
              return true;
            }
          } else if (cp.newParamId === customParam.newParamId) {
            updateParam(this.customParams, i, customParam, cp.view);
            return true;
          }
          return false;
        }));
        if (!found) {
          this.customParams.push(customParam);
        }
        this.checkTokens();
        this.checkHtmlFieldForErrors();
        this.checkPrePostForErrors();
      },
      customParamDeleted: function (customParam, widget) {
        if (customParam.id !== 0) {
          this.deletedParams.push(customParam);
          this.customParams = _.filter(this.customParams, function (p) {
            return customParam.id !== p.id;
          });
        } else {
          this.customParams = _.filter(this.customParams, function (p) {
            return customParam.newParamId !== p.newParamId;
          });
        }
        dojo.destroy(widget.domNode);
        if (this.customParams.length === 0) {
          dojo.addClass(this.pageVariablesHolder, "hidden");
        }
        this.checkHtmlFieldForErrors();
        this.checkPrePostForErrors();
      },
      setupNewScript: function () {
        this.html.setChecked(true);
        qubit.Util.setText(this.heading, "Add New Script");
        dojo.addClass(this.scriptTypeHolder, "visible");
        this.active.setValue(true);
        this.setFilters([new qubit.qtag.data.model.Filter(-1,
            qubit.qtag.CreateScript.DEFAULT_FILTER_NAME, "",
            qubit.qtag.data.dao.FilterDAO.INCLUDE, 1,
            qubit.qtag.data.dao.FilterDAO.ALL)]);
        this.scriptChooser = new qubit.qtag.ScriptChooser();
        this.scriptChooser.placeAt(this.scriptChooserHolder);
        dojo.connect(this.scriptChooser, "onScriptChosen", this,
            this.templateScriptSelected);
        dojo.connect(this.scriptChooser, "onVendorSelected", this,
            this.vendorSelected);
        dojo.connect(this.templateCategory, 'onChange', this,
            this.categorySelected);
        qubit.qtag.data.dao.CategoryDAO.getCategories(dojo.hitch(this,
            this.showCategories));
        this.changeType();
        this.setupDependencies([]);
      },
      vendorSelected: function (vendor) {
        if (vendor) {
          if (this.lastVendor && (this.lastVendor.id !== vendor.id)) {
            this.resetTemplateDetail();
            this.clearParams();
          }
          this.lastVendor = vendor;
        }
      },
      showCategories: function (categories) {
        categories.sort(function (a, b) {
          return a.name > b.name;
        });
        if (categories.length > 0) {
          this.showTemplates(categories[0].id);
        }
        this.templateCategory.addOption(dojo.map(categories, function (c) {
          return {
            label: c.name,
            value: c.id
          };
        }));
      },
      categorySelected: function () {
        this.showTemplates(this.templateCategory.getValue());
      },
      showTemplates: function (categoryId) {
        qubit.qtag.data.dao.ScriptTemplateDAO.getScriptTemplates(categoryId)
                .then(dojo.hitch(this, this.doShowTemplates));
      },
      doShowTemplates: function (templates) {
        this.scriptChooser.setTemplates(templates);
      },
      templateScriptSelected: function (scriptTemplate) {
        qubit.qtag.data.dao.ScriptTemplateDAO
              .getScriptTemplateDetailForTemplate(
                      scriptTemplate,
                      dojo.hitch(this, this.populateScriptFromTemplate));
      },
      populateScriptFromTemplate: function (template) {
        this.scriptTemplate = template;
        this.async.setValue(template.async);
        this.usesDocWrite.setValue(template.usesDocWrite);
        this.clearParams();
        var vname = "";
        
        if (!template.isOneVersionOnly && template.version !== "backport") {
          vname = " (" + template.version.replace(/\._(\d)/g, ".$1") + ")";
        }
        
        qubit.Util.setText(this.templateDetailName, template.name + vname);
        this.addTemplateHeadingButtons(template);
        this.inputs = dojo.map(template.scriptParams,
          dojo.hitch(this, function (param, i) {
            var input = new qubit.qtag.ParamValueInput({
                param: param,
                colorIndex: (i % 14) + 1,
                customVars: this.customVars,
                profileId: this.profile.id
              });
            input.placeAt(this.templateDetailParams);
            return input;
          }));
        this.createTemplateView(template);
        if (this.script) {
          this.populateTemplatedScriptValues();
        }
        this.scriptSelected = true;
      },
      addTemplateHeadingButtons: function (template) {
        var editButton, toggleButton;
        if (qubit.Applications.isAdminUser()) {
          editButton = new dijit.form.Button({
            label: "Edit",
            "class": "subtle small editScriptLibrary"
          });
          dojo.connect(editButton, "onClick", 
              this, this.showScriptLibrary(template));
          
          dojo.place(editButton.domNode, this.templateDetailName, "first");
        }   
        
        toggleButton = new dijit.form.Button({
          label: "Toggle Detail",
          "class": "subtle small editScriptLibrary"
        });
        dojo.connect(toggleButton, "onClick", 
          this, function () {
            dojo.toggleClass(this.templateDetailView.domNode, "hidden");
          });
        dojo.place(toggleButton.domNode, this.templateDetailName, "first");
      },
      clearParams: function () {
        qubit.Util.setText(this.templateDetailName, "");
        dojo.forEach(this.inputs, function (input) {
          dojo.destroy(input.domNode);
        });
        this.scriptSelected = false;
      },
      createTemplateView: function (template) {
        this.resetTemplateDetail();
        this.templateDetailView = new qubit.qtag.TemplateDetailView({
          template: template
        });
        this.templateDetailView.placeAt(this.templateDetailViewHolder);
        dojo.addClass(this.templateDetailView.domNode, "hidden");
      },
      resetTemplateDetail: function () {
        if (this.templateDetailView) {
          dojo.destroy(this.templateDetailView.domNode);
          this.templateDetailView = null;
        }
      },
      populateTemplatedScriptValues: function () {
        var paramValuesByParamId = {};
        dojo.forEach(this.script.params, function (param) {
          paramValuesByParamId[param.scriptParam.id] = param;
        });
        dojo.forEach(this.inputs, function (input) {
          input.populate(paramValuesByParamId[input.param.id]);
        });
      },
      showLocationDetail: function () {
        if (this.location.getValue() === "3") {
          dojo.addClass(this.locationDetailHolder, "visible");
        } else {
          dojo.removeClass(this.locationDetailHolder, "visible");
        }
      },
      createFilterList: function (cb) {
        if (this.script) {
          qubit.qtag.data.dao.FilterDAO.getFilters(this.profile.id,
              this.script.filterGroupId)
            .then(dojo.hitch(this, function (filters) {
              this.setFilters(filters);
              if (cb) {
                cb();
              }
            }));
        } else {
          if (cb) {
            cb();
          }
        }
      },
      showScript: function () {
        qubit.Util.setText(this.heading, "Edit Script");
        this.showElement(this.customScriptHolder, this.templatedScriptHolder);
        if (this.script.scriptTemplateId) {
          this.setTemplatedScriptValues();
        } else {
          this.setCustomScriptValues();
        }
        this.changeType();
        this.scriptNameText.setValue(this.script.name);
        this.async.setValue(this.script.async);
        this.dedupe.setValue(this.script.dedupe);
        this.needsConsent.setValue(this.script.needsConsent);
        this.usesDocWrite.setValue(this.script.usesDocWrite);
        this.active.setValue(this.script.active);
        this.createFilterList(dojo.hitch(this, function () {
          var hasFilters, hasPre, hasPost, hasDependencies, hasPageVariables,
            usesAnOption;
          usesAnOption = this.script.usesDocWrite || this.script.dedupe || 
            !this.script.async;
          hasFilters = (this.filters.length > 0) &&
            (this.filters[0].name !== 
              qubit.qtag.CreateScript.DEFAULT_FILTER_NAME);
          hasPre = !!this.script.pre;
          hasPost = !!this.script.post;
          hasDependencies = this.script.parentDependencies.length > 0;
          hasPageVariables = 
            (!this.script.scriptTemplateId && this.hasCustomParams());

          if (usesAnOption) {
            this.highlightTab("settings");
          }
          if (hasFilters) {
            this.highlightTab("filter");
          }
          if (hasPre || hasPost) {
            this.highlightTab("prePost");
          }
          if (hasPageVariables) {
            this.highlightTab("params");
          }
          if (hasDependencies) {
            this.highlightTab("dependencies");
          }
          
          if (hasFilters || hasPre || hasPost || hasDependencies || 
              hasPageVariables || usesAnOption) {
            this.toggleAdvanced();
          }
          this.asyncClicked();
        }));
        
        this.validateStringAccessor();
        
        this.setupDependencies(this.script.parentDependencies);
      },
      highlightTab: function (section) {
        dojo.addClass(this[section + "Option"], "highlight");
      },
      setupDependencies: function (dependencies) {
        var script = this.script;
        qubit.qtag.data.dao.ScriptDAO.getScripts(this.profile.id, 
          dojo.hitch(this, function (scripts) {
            this.scripts = {};
            dojo.forEach(scripts, dojo.hitch(this, function (script) {
              this.scripts[script.id] = script;
            }));
            this.dependenciesSelector.setData(_.filter(scripts, function (s) {
              return s.active && (!script || (s.id !== script.id));
            }), dependencies);
          }));
        this.initialDependencies = dependencies;
      },
      setTemplatedScriptValues: function () {
        this.templatedScript.setChecked(true);
        this.templateScriptSelected({id: this.script.scriptTemplateId});
      },
      setCustomScriptValues: function () {
        this.customScript.setChecked(true);
        this.preText.setValue(this.script.pre);
        this.postText.setValue(this.script.post);
        if (this.script.html) {
          this.html.setChecked(true);
          this.htmlText.setValue(this.script.html);
          this.showHtml();
        } else {
          this.url.setChecked(true);
          this.urlText.setValue(this.script.url);
          this.showUrl();
        }
        this.location.setValue(this.script.locationId);
        this.position.setValue(this.script.positionId);
        this.locationDetail.setValue(this.script.locationDetail);
      },
      populateCustomParams: function () {
        if (this.hasCustomParams()) {
          dojo.forEach(this.script.paramValues, 
            dojo.hitch(this, function (customParam) {
              var view = new qubit.qtag.CustomScriptParam({
                customParam: customParam,
                customVars: this.customVars,
                onUpdate: dojo.hitch(this, this.newCustomParamUpdated),
                onDelete: dojo.hitch(this, this.customParamDeleted)
              });
              view.placeAt(this.pageVariablesHolder);
              customParam.view = view;
              this.customParams.push(customParam);
              dojo.removeClass(this.pageVariablesHolder, "hidden");
              dojo.removeClass(this.pageVariableButtonHolder, "hidden");
            }));
        }
        this.checkTokens();
      },
      hasCustomParams: function () {
        return this.script && this.script.paramValues && 
          this.script.paramValues.length > 0;
      },
      changeScriptSource: function () {
        this.JSValidator.clear();
        NOTIFICATIONS.clear();
        if (this.url.checked) {
          this.showUrl();
        } else {
          this.showHtml();
        }
        this.checkTokens();
      },
      showUrl: function () {
        this.showElement(this.urlSourceHolder, this.htmlSourceHolder);
        this.showPrePost(true);
        this.asyncClicked();
      },
      showHtml: function () {
        this.showElement(this.htmlSourceHolder, this.urlSourceHolder);
        this.showPrePost(false);
        this.asyncClicked();
        this.refreshHtmlTextCMEditor();
      },
      toggleAdvanced: function (e) {
        if (e) {
          dojo.stopEvent(e);
        }
        dojo.toggleClass(this.advancedFeaturesHolder, "visible");
        if (dojo.hasClass(this.advancedFeaturesHolder, "visible")) {
          qubit.Util.setText(this.expandoHolder, "-");
        } else {
          qubit.Util.setText(this.expandoHolder, "+");
        }
      },
      showCreateFilterDialogue: function (e) {
        dojo.stopEvent(e);
        new qubit.qtag.CreateFilter({
          profile: this.profile,
          script: this.script,
          onSave: dojo.hitch(this, this.filterCreated)
        }).show();
      },
      showCreateEditConsent: function (e) {
        dojo.stopEvent(e);
        new qubit.qtag.EditConsent({
          profile: this.profile
        }).show();
      },
      showConsentPreviewWindow: function () {
        qubit.qtag.data.dao.ScriptDAO.getScriptWithName(
          this.profile.id,
          qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptName,
          dojo.hitch(this, function (scriptSummary) {
            var previewUrl = [
              window.location.protocol,
              "//",
              window.location.host,
              "/QDashboard/qtag/client/",
              qubit.data.UserManager.client.id,
              "/profile/",
              this.profile.id,
              "/filtergroup/",
              scriptSummary.filterGroupId,
              "/script/",
              scriptSummary.id,
              "/preview_consent"
            ].join("");

            new qubit.qtag.PreviewConsent({
              url: previewUrl
            }).show();
          })
        );
      },
      asyncClicked: function () {
        if ((this.async.checked && (this.html.checked)) ||
            (this.async.checked && (this.url.checked) && 
            (this.usesDocWrite.checked))) {
          dojo.removeClass(this.scriptLocationHolder, "hidden");
        } else {
          dojo.addClass(this.scriptLocationHolder, "hidden");
        }
      },
      confirmConsent: function () {
        if (this.needsConsent.getValue()) {
          var confirmed;
          confirmed = window.confirm("IMPORTANT: Whilst we are providing " +
              "this product to support you in your efforts to comply with " +
              "the legal requirements in relation to cookie consent " +
              "please be aware that you are responsible for the legal " +
              "compliance of your website and in particular for assessing " +
              "whether the consent option you chose will result in " +
              "compliance with the new laws. You may wish to seek " +
              "legal advice before choosing a consent option.");
          if (!confirmed) {
            this.needsConsent.setValue(false);
          }
        }
      },
      filterCreated: function (filter) {
        var filters = this.getFilters(), minId;
        //set the id of the newly created filter to -1 indicating that it
        //doesn't exist in the database yet. We need to have unique ids for
        //the DataGrid, therefore we find the smallest negative id among
        //the existing filters and decrement it by 1 to use as the id of the
        //new filter.
        filter.id = -1;
        if (filters.length > 0) {
          minId = _.min(filters, function (f) { return f.id; });
          minId = minId.id;
          if (minId < 0) {
            filter.id = minId - 1;
          }
        }
        filters.push(filter);
        this.setFilters(filters);
        this.grid.setStore(this.createStore());
      },
      changeType: function () {
        this.JSValidator.clear();
        if (this.templatedScript.checked) {
          this.showElement(this.templatedScriptHolder, this.customScriptHolder);
          this.async.set("disabled", true);
          this.usesDocWrite.set("disabled", true);
          if (!this.script) {
            dojo.addClass(this.templateCategoryHolder, "visible");
          }
          this.showPrePost(false);
          this.showCustomScriptParameters(false);
        } else {
          this.showElement(this.customScriptHolder, this.templatedScriptHolder);
          dojo.removeClass(this.templateCategoryHolder, "visible");
          this.async.set("disabled", false);
          this.async.setValue(true);
          this.usesDocWrite.set("disabled", false);
          this.usesDocWrite.setValue(false);
          this.changeScriptSource();
          this.showCustomScriptParameters(true);
        }
      },
      requestScript: function () {
        var requestScriptDialog = new qubit.qtag.RequestScript();
        requestScriptDialog.show();
      },
      showElement: function (shownElement, hiddenElement) {
        if (shownElement) {
          dojo.addClass(shownElement, "visible");
          dojo.removeClass(hiddenElement, "visible");
        }
      },
      createFilterGrid: function () {
        var store, layout, grid, gridParams, source, padding, removePadding;
        padding = 14;
        store = this.createStore();
        layout = [];
        removePadding = dojo.isIE;
        if (!this.useDragDrop) {
          layout.push({
            field: 'id',
            name: ' ',
            width: (48 - (removePadding ? padding : 0)) + 'px',
            formatter: dojo.hitch(this, function (filterId) {
              return new dijit.form.Button({
                label: "\u25B2",
                "class": "subtle small",
                onClick: dojo.hitch(this,
                    dojo.partial(this.doIncreasePriority, filterId))
              });
            })
          });
          layout.push({
            field: 'id',
            name: ' ',
            width: (48 - (removePadding ? padding : 0)) + 'px',
            formatter: dojo.hitch(this, function (filterId) {
              return new dijit.form.Button({
                label: "\u25BC",
                "class": "subtle small",
                onClick: dojo.hitch(this,
                    dojo.partial(this.doDecreasePriority, filterId))
              });
            })
          });
        }
        layout.push({
          field: "filterType",
          name: " ",
          classes: "center",
          width: (80 - (removePadding ? padding : 0)) + 'px',
          formatter: function (type) {
            if (parseInt(type, 10) === qubit.qtag.data.dao.FilterDAO.EXCLUDE) {
              return "<span class=\"exclude\">[Exclude]</span>";
            } else {
              return "<span class=\"include\">[Include]</span";
            }
          }
        });
        layout.push({
          field: "patternType",
          name: " ",
          classes: "center",
          width: (80 - (removePadding ? padding : 0)) + 'px',
          formatter: function (type) {
            if (parseInt(type, 10) >= qubit.qtag.data.dao.FilterDAO.SESSION) {
              return "<span class=\"sessionFilter\">[Session]</span";
            } else {
              return "<span class=\"urlFilter\">[URL]</span>";
            }
          }
        });
        layout.push({
          field: 'name',
          name: ' ',
          classes: "filterName",
          width: ((this.useDragDrop ? 299 : 219) -
            (removePadding ? padding : 0)) + 'px'
        });
        layout.push({
          field: 'id',
          name: ' ',
          width: (80 - (removePadding ? padding : 0)) + 'px',
          formatter: dojo.hitch(this, function (filterId) {
            return new dijit.form.Button({
              label: "Edit",
              "class": "subtle small hidden edit",
              iconClass: "icon icon-14px-edit",
              onClick: dojo.hitch(this,
                  dojo.partial(this.doEditFilter, filterId))
            });
          })
        });
        layout.push({
          field: 'id',
          name: ' ',
          width: (91 - (removePadding ? padding : 0)) + 'px',
          formatter: dojo.hitch(this, function (filterId) {
            return new dijit.form.Button({
              label: "Delete",
              "class": "subtle small hidden delete",
              iconClass: "icon icon-14px-delete",
              onClick: dojo.hitch(this,
                  dojo.partial(this.doDeleteFilter, filterId))
            });
          })
        });
        gridParams = {
          query: {
            name: '*'
          },
          autoHeight: true,
          canSort: function () {
            return false;
          },
          autoWidth: true,
          store: store,
          rowHeight: 32,
          structure: layout,
          onRowDblClick: dojo.hitch(this, function (e) {
            var item = this.grid.getItem(e.rowIndex),
              filterId = this.grid.store.getValue(item, "id", null);
            this.doEditFilter(filterId);
          })
        };
        if (this.useDragDrop) {
          gridParams.plugins = {
            dnd: true
          };
        }
        grid = new dojox.grid.EnhancedGrid(gridParams,
          document.createElement('div'));
        this.grid = grid;
        grid.onFetchError = function (e) {
          console.debug(e);
        };
        this.filterListHolder.appendChild(grid.domNode);
        grid.startup();

        if (this.useDragDrop) {
          this.source =  new dojo.dnd.Source(grid.id);
          this.dndDropHandle = dojo.connect(this.source,
            'onDndDrop', dojo.hitch(this, this.onDndDrop));
          dojo.connect(this.grid, "onMouseDownRow", this, function (e) {
            var dnd = this.grid.pluginMgr.getPlugin("Dnd");
            this.grid.selection.clear();
            this.grid.selection.select(e.rowIndex);
            this.dragStarted = 1;
            this.dragIndex = e.rowIndex;
            dnd._dndRegion = dnd._getDnDRegion(e.rowIndex, e.cell.index);
            dnd._isMouseDown = true;

            dojo.addClass(this.grid.domNode, "rowDrag");
            dojo.removeClass(this.grid.getRowNode(e.rowIndex), "rowHover");
          });
          dojo.connect(this.grid, "onMouseOut", this, function (e) {
            this.dragStarted = 0;
          });
          dojo.connect(this.grid, "onMouseOverRow", this, function (e) {
            dojo.addClass(this.grid.getRowNode(e.rowIndex), "rowHover");
          });
          dojo.connect(this.grid, "onMouseUp", this, function (e) {
            this.dragStarted = 0;
            dojo.removeClass(this.grid.domNode, "rowDrag");
            dojo.addClass(this.grid.getRowNode(e.rowIndex), "rowHover");
          });
          dojo.connect(this.grid, "onMouseMove", this, function (e) {
            var dnd = this.grid.pluginMgr.getPlugin("Dnd");
            if (this.dragStarted > 1) {
              dnd._dndRegion = {
                type: "row",
                selected: [[this.dragIndex]]
              };
              this.dragStarted = 0;
            } else if (this.dragStarted === 1) {
              this.dragStarted += 1;
            }
          });
          dojo.connect(this.grid, "onMouseOutRow", this, function (e) {
            dojo.removeClass(this.grid.getRowNode(e.rowIndex), "rowHover");
          });
        }
      },
      doDeleteFilter: function (filterId) {
        var newFilters = [], filter;
        filter = this.getFilter(filterId);
        dojo.forEach(this.getFilters(), dojo.hitch(this, function (f) {
          if (f.id !== filter.id) {
            newFilters.push(f);
          } else {
            if (filter.id > 0) {
              this.deletedFilters.push(filter);
            }
          }
        }));
        this.setFilters(newFilters);
        this.grid.setStore(this.createStore());
      },
      createStore: function () {
        var filters = dojo.clone(this.getFilters()), store;
        filters.reverse();
        store = new dojo.data.ItemFileReadStore({
          data: {
            identifier: 'id',
            label: 'title',
            items: filters
          }
        });
        return store;
      },
      doEditFilter: function (filterId) {
        new qubit.qtag.CreateFilter({
          profile: this.profile,
          script: this.script,
          filter: this.getFilter(filterId),
          onSave: dojo.hitch(this, this.filterSaved)
        }).show();
      },
      filterSaved: function (filter) {
        var filters = this.getFilters();
        filters = dojo.map(filters, function (f) {
          return f.id === filter.id ? filter : f;
        });
        this.setFilters(filters);
        this.grid.setStore(this.createStore());
      },
      doIncreasePriority: function (filterId) {
        var filter = this.getFilter(filterId);
        this.setNewPriority(filter, filter.priority + 1);
      },
      doDecreasePriority: function (filterId) {
        var filter = this.getFilter(filterId);
        this.setNewPriority(filter, filter.priority - 1);
      },
      setNewPriority: function (filter, n) {
        var filters = this.getFilters(), i = 0;
        //can't have a negative priority
        n = Math.max(0, n);
        filters.splice(filter.priority, 1);
        filters.splice(n, 0, filter);
        //reassign priorities based on the array order
        _.each(filters, function (f, k) { filters[k].priority = i; i += 1; });
        this.setFilters(filters);
        this.grid.setStore(this.createStore());
      },
      onDndDrop: function () {
        var i, filters = this.getFilters();
        i = filters.length;
        dojo.forEach(filters, dojo.hitch(this, function (filter) {
          filter.priority = i;
          i -= 1;
        }));

        if (this.useDragDrop) {
          dojo.removeClass(this.grid.domNode, "rowDrag");
        }
        this.setFilters(filters);
        this.grid.setStore(this.createStore());
      },
      getFilter: function (id) {
        return _.detect(this.getFilters(), function (f) {
          return f.id === id;
        });
      },
      getFilters: function () {
        return this.filters;
      },
      
      setFilters: function (filters) {
        this.filters = this.normalizePriorities(filters);
        dojo.forEach(this.filters, function (filter) {
          if (filter.patternType === 110) {
            filter.patternType = 100;
          } else if ((filter.patternType >= 10) && (filter.patternType < 20)) {
            filter.patternType -= 10;
          }
        });
      },
      normalizePriorities: function (filters) {
        var i = 0;
        filters = _.sortBy(filters, function (f) { return f.priority; });
        dojo.forEach(filters, function (f, k) {
          filters[k].priority = i;
          i += 1;
        });
        return filters;
      },
      getCustomVariables: function () {
        var customVariables;
        customVariables = _.filter(_.pluck(this.customParams, "scriptParam"), 
          function (scriptParam) {
            return !scriptParam.jsName && (scriptParam.id < 0); 
          });
        return customVariables; 
      },
      getCustomParams: function () {
        return this.customParams;
      },
      cancel: function () {
        this.close();
      },
      submitForm: function (e) {
        dojo.stopEvent(e);
        if ((this.html.checked &&
              this.criticalHTMLErrors) ||
            (this.criticalPrePostErrors &&
             !this.html.checked)) {
          qubit.DefaultNotificationsMgr.notify("script-save",
            "<b>Please resolve errors in your script before saving!</b>");
          return;
        }
        this.doneButton.set("disabled", true);
        if (!this.form.validate()) {
          this.doneButton.set("disabled", false);
        } else {
          qubit.qtag.data.dao.ConsentDAO.getConsent(this.profile.id, 
            dojo.hitch(this, this.consentLoaded));
        }
      },
      consentLoaded: function (consentScript) {
        qubit.qtag.data.dao.ScriptDAO.getScripts(this.profile.id,
            dojo.hitch(this, dojo.partial(this.validateScript, consentScript)));
      },
      validateScript: function (consentScript, scripts) {
        var emptyParams, currentScript = this.script;

        this.scriptNameText.isValid = function () {
          var name, existing;
          name = this.getValue();
          existing = _.detect(scripts, function (script) {
            return (script.name === name);
          });
          if (existing) {
            if (currentScript) {
              //this is an existing script, so check if we're trying to use
              //the name of some other script or simply keeping the name
              return (currentScript.id === existing.id);
            } else {
              //this is a new script and another one with this name exists
              return false;
            }
          } else {
            //no such name exists
            return true;
          }
        };

        if (!this.scriptNameText.isValid()) {
          this.scriptNameText.focus();
          this.scriptNameText.invalidMessage =
            "A script with this name already exists in this container.";
          this.form.validate();
          this.doneButton.set("disabled", false);
          return false;
        } 

        if (!this.script) {
          if (this.templatedScript.checked && !this.scriptSelected) {
            this.doneButton.set("disabled", false);
            this.showError("Please select a script");
            return false;
          }
        }
        if (this.templatedScript.checked) {
          emptyParams = _.filter(this.getParams(), function (param) {
            return param.customVarId === "-1";
          });
          
          if (emptyParams.length > 0) {
            this.doneButton.set("disabled", false);
            this.showError("Please set values for all variables");
            
            return false;
          }
        }
        
        this.setConsent(consentScript, currentScript, scripts);
      },
      validateStringAccessor: function () {
        var scr = this.script;
        if (scr) {
          this.abTestCheckbox.setChecked(!!scr.locked);
          this.validateStringAccessorCheckbox();
        }
      },
      validateStringAccessorCheckbox: function () {
        if (this.abTestCheckbox.checked) {
          dojo.removeClass(this.stringAccessorButton.domNode, "hidden");
        } else {
          dojo.addClass(this.stringAccessorButton.domNode, "hidden");
        }
      },
      showError: function (message) {
        this.doneButton.set("disabled", false);
        qubit.Util.setText(this.errorMessage, message);
        setTimeout(dojo.hitch(this, function () {
          qubit.Util.setText(this.errorMessage, "");
        }), 8000);
        NOTIFICATIONS.notify("save-script", message, 5000);
      },
      setConsent: function (consentScript, currentScript, scripts) {
        var requireConsent = null,
          hasActiveConsent = null;
        hasActiveConsent = _.select(scripts, function (script) {
          return (script.needsConsent === true) && script.active;
        });
        requireConsent = hasActiveConsent.length > 0 ? true : false;
        requireConsent = requireConsent || 
          (this.needsConsent.checked && this.active.checked);
        // if there is only one script, which is already saved,
        //and that script is the current one, then it needs consent
        //based on the current setting.
        if (!!currentScript && (hasActiveConsent.length === 1) &&
            (hasActiveConsent[0].id === currentScript.id)) {
          requireConsent = this.needsConsent.checked && this.active.checked;
        }
        if (requireConsent) {
          qubit.qtag.data.dao.ScriptDAO.activateScript(
            this.profile.id,
            consentScript.filterGroupId,
            consentScript.id,
            dojo.hitch(this, this.doSubmitForm)
          );
        } else {
          qubit.qtag.data.dao.ScriptDAO.inactivateScript(
            this.profile.id,
            consentScript.filterGroupId,
            consentScript.id,
            dojo.hitch(this, this.doSubmitForm)
          );
        }
      },
      errorHandler: function (msg, e) {
        var outDatedPattern = "Profile locked. Cannot proceed";
        if (msg.responseText &&
              msg.responseText.indexOf(outDatedPattern) !== -1) {
          this.showError("The container is locked because is currently " +
            "being committed.<br/>Please reload the page to edit this tag.");
        } else {
          this.showError("Unexpected error while saving the script.<br/>" +
            "Try reloading the page.");
          log.ERROR("Unexpected error while saving the script: \n" +
                  msg.responseText);
        }
      },
      doSubmitForm: function () {
        var filterEH, scriptEH, filterGroupEH, url, html;
        
        filterEH = qubit.qtag.data.dao.FilterDAO.errorHandler;
        scriptEH = qubit.qtag.data.dao.ScriptDAO.errorHandler;
        filterGroupEH = qubit.qtag.data.dao.FilterGroupDAO.errorHandler;
        
        qubit.qtag.data.dao.FilterDAO.errorHandler =
          this.errorHandler.bind(this);
        qubit.qtag.data.dao.ScriptDAO.errorHandler =
          this.errorHandler.bind(this);
        qubit.qtag.data.dao.FilterGroupDAO.errorHandler =
          this.errorHandler.bind(this);
        
        NOTIFICATIONS
              .notify("save-script", "<b>Script save triggered...</b>", 20000);
        
        if (this.url.checked) {
          url = this.urlText.getValue();
          html = "";
        } else {
          url = "";
          html = this.htmlText.getValue();
        }
        
        var locked = this.abTestCheckbox.checked;
        
        if (!this.script) {
          if (this.templatedScript.checked) {
            //If you change this, also change it in MoveScript.js
            qubit.qtag.data.dao.ScriptDAO.createTemplatedScript(
              this.profile.id,
              this.scriptNameText.getValue(),
              this.active.checked,
              this.scriptTemplate.id,
              this.getParams(),
              this.dedupe.checked,
              this.needsConsent.checked,
              dojo.hitch(this, this.saveFilters),
              this.scriptTimeout.getValue(),
              locked
            );
          } else {
            //If you change this, also change it in MoveScript.js
            qubit.qtag.data.dao.ScriptDAO.createCustomScript(
              this.profile.id,
              this.scriptNameText.getValue(),
              this.active.checked,
              url,
              this.preText.getValue(),
              this.postText.getValue(),
              html,
              this.async.checked,
              this.usesDocWrite.checked,
              this.location.getValue(),
              this.position.getValue(),
              this.locationDetail.getValue(),
              this.dedupe.checked,
              this.needsConsent.checked,
              dojo.hitch(this, this.saveFilters),
              this.scriptTimeout.getValue(),
              locked
            );
          }
        } else {
          if (this.script.scriptTemplateId) {
            //If you change this, also change it in MoveScript.js
            qubit.qtag.data.dao.ScriptDAO.saveTemplatedScript(
              this.profile.id,
              this.script.filterGroupId,
              this.script.id,
              this.scriptNameText.getValue(),
              this.active.checked,
              this.getParams(),
              this.dedupe.checked,
              this.needsConsent.checked,
              dojo.hitch(this, dojo.partial(this.saveFilters, this.script)),
              this.scriptTimeout.getValue(),
              locked
            );
          } else {
            //If you change this, also change it in MoveScript.js
            qubit.qtag.data.dao.ScriptDAO.saveCustomScript(
              this.profile.id,
              this.script.filterGroupId,
              this.script.id,
              this.scriptNameText.getValue(),
              this.active.checked,
              url,
              this.preText.getValue(),
              this.postText.getValue(),
              html,
              this.async.checked,
              this.usesDocWrite.checked,
              this.location.getValue(),
              this.position.getValue(),
              this.locationDetail.getValue(),
              this.dedupe.checked,
              this.needsConsent.checked,
              dojo.hitch(this, dojo.partial(this.saveFilters, this.script)),
              this.scriptTimeout.getValue(),
              locked
            );
          }
        }
        
        qubit.qtag.data.dao.FilterDAO.errorHandler = filterEH;
        qubit.qtag.data.dao.ScriptDAO.errorHandler = scriptEH;
        qubit.qtag.data.dao.FilterGroupDAO.errorHandler = filterGroupEH;
      },
      getParams: function () {
        if (this.inputs) {
          return dojo.map(this.inputs, function (input) {
            return input.getParamValue();
          });
        } else {
          return [];
        }
      },
      saveFilters: function (script, errorHandler) {
        NOTIFICATIONS
                .notify("sub-save", "<b>Saving filters...</b>", 1000);
        var deletedFilters, savedFilters, savedVariables, filters;
        filters = this.getFilters();
        //add +1 to the priority, because the REST API expects that the
        //highest priority is 1, not 0
        filters = dojo.map(filters, function (f) {
          f.priority += 1;
          return f;
        });
        deletedFilters = new dojo.DeferredList(
          dojo.map(this.deletedFilters, dojo.hitch(this, function (f) {
            return qubit.qtag.data.dao.FilterDAO.deleteFilter(this.profile.id,
                this.script.filterGroupId, f.id);
          }))
        );
        savedFilters = new dojo.DeferredList(
          dojo.map(this.getFilters(), dojo.hitch(this, function (f) {
            var patternType;
            if (!this.dedupe.checked) {
              patternType = f.patternType;
            } else {
              patternType = f.patternType + 10;
            }

            if (f.id > 0) {
              return qubit.qtag.data.dao.FilterDAO.saveFilter(this.profile.id,
                  script.filterGroupId, f.id, f.name, f.pattern,
                  patternType, f.priority, f.filterType, errorHandler);
            } else {
              return qubit.qtag.data.dao.FilterDAO.createFilter(this.profile.id,
                  script.filterGroupId, f.name, f.pattern,
                  patternType, f.priority, f.filterType, errorHandler);
            }
          }))
        );
        savedVariables = new dojo.DeferredList(
          dojo.map(this.getCustomVariables(), dojo.hitch(this, function (cv) {
            if (cv.id > 0) {
              return qubit.qtag.data.dao.CustomVarDAO
                .saveCustomVariable(this.profile.id, cv.id, cv.name, cv.value, 
                  cv.typeId);
            } else {
              return qubit.qtag.data.dao.CustomVarDAO
                .addCustomVariable(this.profile.id, cv.name, cv.value, cv.typeId)
                .then(function (newCustomVariable) {
                  cv.id = newCustomVariable.id;
                });
            }
          }))
        );
        new dojo.DeferredList([deletedFilters, savedFilters, savedVariables])
          .then(dojo.hitch(this, dojo.partial(this.saveParams, script)));
      },
      saveParams: function (script) {
        NOTIFICATIONS
                .notify("sub-save", "<b>Saving parameters...</b>", 1000);
        var newParams, deletedParams;
        newParams = new dojo.DeferredList(
          dojo.map(this.getCustomParams(), dojo.hitch(this, function (param) {
            var customVarId, universalVarId;
            customVarId = !param.scriptParam.jsName ? 
              param.scriptParam.id : null;
            universalVarId = !!param.scriptParam.jsName ? 
              param.scriptParam.id : null;
            if (param.id !== 0) {
              return qubit.qtag.data.dao.ScriptDAO.saveParam(this.profile.id, 
                  script.filterGroupId, script.id, param.id, param.paramName, 
                  param.token, universalVarId, customVarId, param.defaultValue);
            } else {
              return qubit.qtag.data.dao.ScriptDAO.addParam(this.profile.id, 
                  script.filterGroupId, script.id, param.paramName, param.token,
                  universalVarId, customVarId, param.defaultValue);
            }
          }))
        );
        deletedParams = new dojo.DeferredList(
          dojo.map(this.deletedParams, dojo.hitch(this, function (param) {
            if (param.id !== 0) {
              return qubit.qtag.data.dao.ScriptDAO.deleteParam(this.profile.id, 
                  script.filterGroupId, script.id, param.id);
            }
          }))
        );
        new dojo.DeferredList([newParams, deletedParams])
          .then(dojo.hitch(this, dojo.partial(this.saveDependencies, script)));
      },
      saveDependencies: function (script) {
        NOTIFICATIONS
                .notify("sub-save", "<b>Saving dependencies...</b>", 1000);
        new dojo.DeferredList(
          [].concat(this.saveNewDependencies(script), 
            this.removeOldDependencies(script))
        ).then(dojo.hitch(this, this.saveDone));
      },
      saveNewDependencies: function (script) {
        var newDependencies;
          
        newDependencies = _.without.apply(this, 
          [].concat(
            [_.pluck(this.dependenciesSelector.getState().selected, "id")], 
            this.initialDependencies
          ));
        return dojo.map(newDependencies, dojo.hitch(this, function (depId) {
          var dependency = this.scripts[depId];
          return qubit.qtag.data.dao.ScriptDAO.addScriptDependency(
            this.profile.id,
            script.filterGroupId,
            script.id,
            dependency.filterGroupId,
            dependency.id
          );
        }));
      },
      removeOldDependencies: function (script) {
        var oldDependencies;
        oldDependencies = 
          _.without.apply(this, [].concat([this.initialDependencies], 
              _.pluck(this.dependenciesSelector.getState().selected, "id")));
        return dojo.map(oldDependencies, dojo.hitch(this, function (depId) {
          return qubit.qtag.data.dao.ScriptDAO.removeScriptDependency(
            this.profile.id,
            script.filterGroupId,
            script.id,
            depId
          );
        }));
      },
      saveDone: function () {
        NOTIFICATIONS.clear();
        NOTIFICATIONS.done("save-script", "<b>Saved.</b>", 2000);
        this.close();
      },
      close: function () {
        this.JSValidator.clear();
        NOTIFICATIONS.clear();
        qubit.qtag.WindowManager.showDashboard();
        //TODO: make sure this is being called in IE!
        if (this.dndDropHandle) {
          dojo.disconnect(this.dndDropHandle);
        }
      },
      testFilters: function (e) {
        dojo.stopEvent(e);
        var ok = false,
          filters = this.getFilters(),
          matchedFilters = [];
        if (filters.length === 0) {
          ok = true;
        } else {
          dojo.forEach(filters, dojo.hitch(this,
            function (urlFilter) {
              if (this.doesUrlFilterMatch(urlFilter,
                  this.filterTest.getValue())) {
                matchedFilters.push(urlFilter);
              }
            }));
          matchedFilters.sort(function (a, b) {
            return b.priority - a.priority;
          });
          dojo.forEach(matchedFilters, function (urlFilter) {
            if (urlFilter.filterType ===
                qubit.qtag.data.dao.FilterDAO.INCLUDE) {
              ok = true;
            } else if (urlFilter.filterType ===
                qubit.qtag.data.dao.FilterDAO.EXCLUDE) {
              ok = false;
            }
          });
        }
        if (ok) {
          qubit.Util.setText(this.filterTestResult,
              "Script would run on this URL");
          dojo.addClass(this.filterTestResult, "filterOK");
          dojo.removeClass(this.filterTestResult, "filterError");
          setTimeout(dojo.hitch(this, function () {
            qubit.Util.setText(this.filterTestResult, "");
          }), 3000);
        } else {
          qubit.Util.setText(this.filterTestResult,
              "Script would NOT run on this URL");
          dojo.removeClass(this.filterTestResult, "filterOK");
          dojo.addClass(this.filterTestResult, "filterError");
          setTimeout(dojo.hitch(this, function () {
            qubit.Util.setText(this.filterTestResult, "");
          }), 3000);
        }
      },
      doesUrlFilterMatch: function (urlFilter, url) {
        var matches = false;
        switch (urlFilter.patternType) {
        case qubit.qtag.data.dao.FilterDAO.EXACT_MATCH:
        case 10 + qubit.qtag.data.dao.FilterDAO.EXACT_MATCH:
          if (url.toLowerCase() === urlFilter.pattern.toLowerCase()) {
            matches = true;
          }
          break;
        case qubit.qtag.data.dao.FilterDAO.SUBSTRING:
        case 10 + qubit.qtag.data.dao.FilterDAO.SUBSTRING:
          if (url.toLowerCase().indexOf(urlFilter.pattern.toLowerCase()) >= 0) {
            matches = true;
          }
          break;
        case qubit.qtag.data.dao.FilterDAO.REGEX:
        case 10 + qubit.qtag.data.dao.FilterDAO.REGEX:
          // compile url pattern
          try {
            if (new RegExp(urlFilter.pattern).test(url)) {
              matches = true;
            }
          } catch (e) {
            matches = false;
          }
          break;
        case qubit.qtag.data.dao.FilterDAO.ALL:
        case 10 + qubit.qtag.data.dao.FilterDAO.ALL:
          matches = true;
          break;
        case qubit.qtag.data.dao.FilterDAO.SESSION:
        case 10 + qubit.qtag.data.dao.FilterDAO.SESSION:
          matches = false;
          break;
        }
        return matches;
      },
      preventSubmitAndTest: function (e) {
        if (e.keyCode === dojo.keys.ENTER) {
          dojo.stopEvent(e);
          this.testFilters();
        }
      },
      showScriptLibrary: function (template) {
        return function () {
          qubit.qtag.WindowManager.showScriptLibrary(template, 
            dojo.hitch(this, this.scriptLibraryClosed));
        };
      }
    });

  qubit.qtag.CreateScript.DEFAULT_FILTER_NAME = "Default filter: Match all";
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/data/dao/ScriptDAO>

dojo.require("dijit._Widget");
dojo.require("dojo.DeferredList");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.MoveScript", 
    [dijit._Widget, dijit._Templated], {
      moveScript: function (script, fromProfileId, toProfileId, 
          copyDependencies, fromClientId) {
        qubit.qtag.data.dao.ScriptDAO.moveScript(
          fromProfileId, 
          script.filterGroupId,
          script.id,
          toProfileId,
          copyDependencies,
          fromClientId
        )
          .then(
            dojo.hitch(this, dojo.partial(this.moveComplete, toProfileId))
          );
      },
      checkConsent: function (toProfileId) {
        qubit.qtag.data.dao.ConsentDAO.findOrCreateConsentScript(
          toProfileId,
          dojo.hitch(this, dojo.partial(this.doCheckConsent, toProfileId))
        );
      },
      doCheckConsent: function (toProfileId) {
        qubit.qtag.data.dao.ScriptDAO.getScripts(toProfileId,
            dojo.hitch(this, dojo.partial(this._updateConsent, toProfileId)));
      },
      _updateConsent: function (toProfileId, scripts) {
        var hasActiveConsent, consentScript;
        hasActiveConsent = _.select(scripts, function (script) {
          return (script.needsConsent === true) && script.active;
        });
        consentScript = _.find(scripts, function (script) {
          return script.name ===
            qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptName;
        });
        if (consentScript) {
          if (hasActiveConsent.length) {
            qubit.qtag.data.dao.ScriptDAO.activateScript(
              toProfileId,
              consentScript.filterGroupId,
              consentScript.id,
              dojo.hitch(this, this.updateProfiles)
            );
          } else {
            qubit.qtag.data.dao.ScriptDAO.inactivateScript(
              toProfileId,
              consentScript.filterGroupId,
              consentScript.id,
              dojo.hitch(this, this.updateProfiles)
            );
          }
        }
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/PasswordStrengthIndicator>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.Form");
dojo.require("dijit.layout.AccordionContainer");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.Settings",
    [dijit._Widget, dijit._Templated],
    {
      widgetsInTemplate: true,
      title: "Settings",
      templateString: dojo.cache("qtag.templates", "Settings.html?cb=" + 
          qubit.v),
      postCreate: function () {
        _gaq.push(['_trackPageview', '/Settings']);
        dojo.connect(this.emailForm, "onSubmit", this, this.changeEmail);
        dojo.connect(this.passwordForm, "onSubmit", this, this.changePassword);
        dojo.connect(this.confirmButton, "onClick", this, this.cancelAccount);
        dojo.connect(this.abandonButton, "onClick", this,
          this.hideCancelAccountConfirmation);
        dojo.connect(this.cancelAccountButton, "onClick", this,
          this.showCancelAccountConfirmation);        
        this.passwordStrengthIndicator =
          new qubit.qtag.PasswordStrengthIndicator();
        this.passwordStrengthIndicator.setValueField(this.newPassword);
        this.passwordStrengthIndicator.placeAt(
          this.password_strength_indicator
        );
        this.emailReentry.validator = dojo.hitch(this, function () {
          return this.emailReentry.getValue() === this.newEmail.getValue();
        });
        this.showCancelHostingIfHosted();
      },
      changeEmail: function (e) {
        this.changeEmailButton.set("disabled", true);
        this.emailStatus.hide();
        if (this.emailForm.validate()) {
          qubit.data.UserManager.updateEmail(this.newEmail.attr("value"), 
            dojo.hitch(this, dojo.partial(this.updateComplete,
                this.changeEmailButton, this.emailStatus))
            );
        } else {
          this.changeEmailButton.set("disabled", false);
        }
        dojo.stopEvent(e);
      },
      changePassword: function (e) {
        this.changePasswordButton.set("disabled", true);
        this.passwordStatus.hide();
        if (this.passwordForm.validate()) {
          qubit.data.UserManager.updatePassword(
            this.oldPassword.attr("value"), 
            this.newPassword.attr("value"), 
            dojo.hitch(this, dojo.partial(this.updateComplete,
                this.changePasswordButton, this.passwordStatus))
          );
        } else {
          this.changePasswordButton.set("disabled", false);
        }
        dojo.stopEvent(e);
      },
      updateComplete: function (button, status, response) {
        button.set("disabled", false);
        var ok = response.status === "OK";
        if (ok) {
          this.clearFields();
          status.success("Details successfully updated");
        } else {
          status.error(response.msg);
        }
      },
      showCancelAccountConfirmation : function () {
        dojo.addClass(this.cancelAccountButton.domNode, "hidden");
        dojo.addClass(this.cancelAccountContainer, "visible");
      },
      hideCancelAccountConfirmation : function () {
        dojo.removeClass(this.cancelAccountButton.domNode, "hidden");
        dojo.removeClass(this.cancelAccountContainer, "visible");
      },      
      cancelAccount: function () {
        qubit.data.UserManager.cancelAccount(
          dojo.hitch(this, this.cancelAccountComplete)
        );
      },
      cancelAccountComplete : function (response) {
        var ok = response.status === "OK";
        if (ok) {
          this.cancelAccountStatus.success("Hosting cancelled");
        } else {
          this.cancelAccountStatus.error(response.msg);
        }
      },   
      showCancelHostingIfHosted : function () {
        if (qubit.data.Permissions.isPermitted("cancelHosting")) {
          qubit.data.UserManager.getClientDetails(dojo.hitch(this, 
            function (client) {
              if (client && client.ccApproved) {
                dojo.addClass(this.cancelAccountArea, "visible");
              }
            }));
        }
      },
      clearFields: function () {
        this.newEmail.attr("value", "");
        this.emailReentry.attr("value", "");
        this.oldPassword.attr("value", "");
        this.newPassword.attr("value", "");
      },
      show : function () {
        this.visible = true;
        this.settingsContainer.show();
      },
      hide : function () {
        this.visible = false;
        this.settingsContainer.hide();
      },  
      toggle : function () {
        if (this.visible) {
          this.hide();
        } else {
          this.show();
        }
      }
    });
});
//= require <qubit/GLOBAL>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.SVCombiner", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "SVCombiner.html?cb=" + 
          qubit.v),
      postCreate: function () {
        if (this.opType === "and") {
          dojo.removeClass(this.and, "hidden");
          dojo.addClass(this.or, "hidden");
        } else if (this.opType === "or") {
          dojo.removeClass(this.or, "hidden");
          dojo.addClass(this.and, "hidden");
        }
      },
      getType: function () {
        return this.opType;
      },
      getJs: function () {
        var js;
        if (this.opType === "and") {
          js = "&&";
        } else if (this.opType === "or") {
          js = "||";
        } else {
          js = "";
        }
        return js;
      },
      getDescriptor: function () {
        return this.opType;
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/SVSelector>
//= require <qubit/qtag/SVCombiner>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.SVRow", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "SVRow.html?cb=" + 
          qubit.v),
      postCreate: function () {
        this.selectors = [];
        this.operators = [];
        dojo.connect(this.andButton, "onClick", this, this.addOpType("and"));
        dojo.connect(this.orButton, "onClick", this, this.addOpType("or"));
        if (this.value) {
          this.setValue(this.value);
        } else if (this.first) {
          this.addSelector();
        } else {
          dojo.addClass(this.opChooser, "first");
        }
      },
      startup: function () {
        this.fixSelectorHeight();
      },
      selectorChanged: function (selector) {
        var i, isStarterBased;
        i = dojo.indexOf(this.selectors, selector);
        if (i === 0) {
          isStarterBased = selector.isStarterBased();
          if (isStarterBased) {
            dojo.addClass(this.orChooser, "hidden");
          } else {
            dojo.removeClass(this.orChooser, "hidden");
          }
          this.onRowTypeChanged(isStarterBased);
        }
        this.onSelectorChanged(selector);
      },
      onRowTypeChanged: function (isStarterBased) {
      },
      onSelectorChanged: function (selector) {
        this.fixSelectorHeight();
      },
      addNewRowListener: function (listener) {
        this.rowListener = listener;
      },
      removeNewRowListener: function () {
        delete this.rowListener;
      },
      addOpType: function (type) {
        return function () {
          if (this.rowListener) {
            this.rowListener(type);
          }
          if (this.selectors.length > 0) {
            this.addOperator(type);
          }
          this.addSelector();
          dojo.removeClass(this.opChooser, "first");
        };
      },
      addOperator: function (type) {
        var combiner;
        combiner = new qubit.qtag.SVCombiner({
          opType: type
        });
        combiner.placeAt(this.holder);
        this.operators.push(combiner);
      },
      addSelector: function () {
        var selector;
        try {
          selector = new qubit.qtag.SVSelector({
            first: (this.selectors.length === 0),
            firstRow: this.first
          });
          selector.placeAt(this.holder);
        } catch (e) {
          window.console.log(e);
        }
        dojo.connect(selector, "removed", this, 
            this.createSelectorRemover(selector));
        dojo.connect(selector, "onTypeChange", this, this.selectorChanged);
        this.selectors.push(selector);

        this.fixSelectorHeight();
        this.updateSelectors();
      },
      fixSelectorHeight: function () {
        dojo.forEach(this.selectors, function (selector) {
          dojo.style(selector.domNode, {
            height: ""
          });
        });
        var h = Math.max.apply(null, dojo.map(this.selectors, 
          function (selector) {
            return dojo.position(selector.domNode).h;
          }));
        if (h > 50) {
          dojo.forEach(this.selectors, function (selector) {
            dojo.style(selector.domNode, {
              height: h + "px"
            });
          });
        } else {
          setTimeout(dojo.hitch(this, this.fixSelectorHeight), 100);
        }
      },
      createSelectorRemover: function (selector) {
        return function () {
          var o, i = dojo.indexOf(this.selectors, selector);
          this.selectors.splice(i, 1);
          selector.destroy();
          if (this.operators.length > 0) {
            o = this.operators.splice(i - 1, 1);
            o[0].destroy();
          }
          if (this.selectors.length === 0) {
            this.removed();
          }
          this.updateSelectors();
        };
      },
      removed: function () {
      },
      updateSelectors: function () {
        dojo.forEach(this.selectors, function (selector, i) {
          selector.update(this.selectors.length === 1, i === 0 && this.first);
        }, this);
      },
      getJs: function () {
        var i, ii, starters, js, starterBased;
        js = [];
        starterBased = this.selectors[0].isStarterBased();
        if (this.selectors.length > 0) {
          if (!starterBased) {
            js.push(this.selectors[0].getJs());
          } else if (this.selectors.length === 1) {
            js.push(true);
          }
          for (i = 1, ii = this.selectors.length; i < ii; i += 1) {
            if (this.operators[i - 1].getType()) {
              if (starterBased) {
                starterBased = this.selectors[i].isStarterBased();
              } else {
                js.push(this.operators[i - 1].getJs());
              }
              if (!starterBased) {
                js.push(this.selectors[i].getJs());
              }
            } else {
              break;
            }
          }
        }
        return js.length > 0 ? "(" + js.join(" ") + ")" : "";
      },
      getStarterJs: function () {
        var i, ii, starters, js, starterBased;
        js = [];
        starterBased = this.selectors[0].isStarterBased();
        if (this.selectors.length > 0) {
          if (starterBased) {
            js.push(this.selectors[0].getJs());
          }
          for (i = 1, ii = this.selectors.length; i < ii; i += 1) {
            if (this.operators[i - 1].getType()) {
              if (this.selectors[i].isStarterBased()) {
                js.push(this.selectors[i].getJs());
              } else {
                break;
              }
            } else {
              break;
            }
          }
        }
        return js.length > 0 ? js.join(" ") : "cb()";
      },
      getDescriptor: function () {
        var i, ii, starterBased, descriptor = {
          variables: [],
          starters: [],
          operators: []
        };
        if (this.selectors.length > 0) {
          starterBased = this.selectors[0].isStarterBased();
          descriptor[starterBased ? "starters" : "variables"].push(
            this.selectors[0].getDescriptor()
          );
          for (i = 1, ii = this.selectors.length; i < ii; i += 1) {
            if (starterBased) {
              starterBased = this.selectors[i].isStarterBased();
            } 
            if (this.operators[i - 1].getType()) {
              if (starterBased) {
                descriptor.starters.push(this.selectors[i].getDescriptor());
              } else {
                descriptor.operators.push(
                  this.operators[i - 1].getDescriptor()
                );
                descriptor.variables.push(this.selectors[i].getDescriptor());
              }
            } else {
              break;
            }
          }
        }
        return (descriptor.variables.length > 0) || 
          (descriptor.starters.length > 0) ? descriptor : null;
      },
      setValue: function (descriptor) {
        var i = this.setStarterValues(descriptor);
        if ((descriptor.starters.length > 0) && 
            (descriptor.variables.length > 0)) {
          this.addOperator("and");
        }
        this.setVariableValues(descriptor, i);
      },
      setStarterValues: function (descriptor) {
        var i = 0, ii;
        if (descriptor.starters && descriptor.starters.length > 0) {
          this.addSelector();
          this.selectors[0].setValue(descriptor.starters[0]);
          if (descriptor.starters.length > 1) {
            for (i = 1, ii = descriptor.variables.length; i < ii; i += 1) {
              this.addOperator("and");
              this.addSelector();
              this.selectors[i].setValue(descriptor.starters[i]);
            }
            if (descriptor.variables.length > 0) {
              this.addOperator("and");
            }
          }
          return i + 1;
        }
        return 0;
      },
      setVariableValues: function (descriptor, initial) {
        var i, ii;
        if (descriptor.variables.length > 0) {
          this.addSelector();
          this.selectors[initial].setValue(descriptor.variables[0]);
          for (i = 1, ii = descriptor.variables.length; i < ii; i += 1) {
            this.addOperator(descriptor.operators[i - 1]);
            this.addSelector();
            this.selectors[initial + i].setValue(descriptor.variables[i]);
          }
        }
      },
      validateForm: function () {
        return dojo.every(this.selectors, 
          function (selector) {
            return selector.validateForm();
          });
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/ScriptChooser>
//= require <qubit/qtag/data/dao/ProfileDAO>
//= require <qubit/qtag/data/dao/ScriptDAO>
//= require <qubit/qtag/MoveScript>
//= require <qubit/dojox/Dialog>
//= require <qubit/NotificationManager>

dojo.require("dojo.cache");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.Select");
dojo.require("dojo.DeferredList");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.MoveScripts", 
    [qubit.qtag.MoveScript], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "MoveScripts.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({});
        this.inherited(arguments);
      },
      postCreate: function () {
        _gaq.push(['_trackPageview', '/MoveScripts']);
        this.inherited(arguments);
        
        dojo.connect(this.otherProfiles, "onChange", this, 
            this.profileSelected);
        dojo.connect(this.otherAccounts, "onChange", this, 
            this.otherAccountSelected);
        dojo.connect(this.scriptFromSelection, "onChange", this, 
            this.scriptFromSelectionChanged);
        dojo.connect(this.saveButton, "onClick", this, 
            this.saveButtonClicked);
        this.setMessages();
        this.loadClientsSelectionBox();
        this.populateProfileDropDown();
        this.getCurrentScripts();
      },
      setMessages: function () {
        var heading, message;
        if (this.fromProfile) {
          dojo.addClass(this.otherAccounts.domNode, "hidden");
          heading = "Copy Script(s) To";
          message = "Choose profile and select script(s). Selected " +
            "scripts in current container will be copied to chosen profile.";
        } else if (this.toProfile) {
          dojo.removeClass(this.otherAccounts.domNode, "hidden");
          heading = "Copy Script(s) From";
          message = "Select profile you want to import scripts from and " +
            "select script(s) to be copied to current container.";
        }
        this.popup.set("title", heading); 
        qubit.Util.setText(this.message, message);
      },
      populateProfileDropDown: function () {
        qubit.qtag.data.dao.ProfileDAO.getProfiles(
          dojo.hitch(this, this.doPopulateProfileDropDown)
        );
      },
      loadClientsSelectionBox: function () {
        if (qubit.OPENTAG_APP.clients && qubit.OPENTAG_APP.clients.length > 1) {
          this.otherAccounts.options = [];
          var clients = qubit.OPENTAG_APP.clients;
          
          if (!clients || clients.length < 2) {
            clients = [{name: "[ no clients to be selected ]", id: "none"}];
          }
          
          this.otherAccounts.addOption(dojo.map(clients, 
            function (profile) {
              return {
                label: profile.clientName || profile.roleName,
                value: profile.clientId
              };
            }
            ));
        } else {
          dojo.addClass(this.otherAccounts.domNode, "hidden");
        }
      },
      loadScriptsSelectionBox: function (scriptsToCopy) {
        var i, scripts = [{name: "--- Copy All ---", id: null}];
        if (!scriptsToCopy || scriptsToCopy.length === 0) {
          scripts = [{name: "[ no scripts to be selected ]", id: "none"}];
        } else {
          for (i = 0; i < scriptsToCopy.length; i = i + 1) {
            scripts.push(scriptsToCopy[i]);
          }
        }
        
        this.scriptFromSelection.options = [];
        this.scriptFromSelection.addOption(dojo.map(scripts, 
          function (script) {
            return {
              label: script.name,
              value: script.id
            };
          }
          ));
      },
      scriptFromSelectionChanged: function () {
        this.singleScriptSelectedToCopy = this.scriptFromSelection.getValue();
      },
      doPopulateProfileDropDown: function (profiles) {
        //reset scripts
        this.loadScriptsSelectionBox([]);
        this.otherProfiles.options = [];
        profiles = dojo.filter(profiles, this.createProfileFilter());
        profiles.sort(function (a, b) {
          return (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1;
        });
        if (!profiles || profiles.length === 0) {
          profiles = [{name: "[ no profiles to be selected ]", id: "none"}];
        }
        this.otherProfiles.addOption(dojo.map(profiles, function (profile) {
          return {
            label: profile.name,
            value: profile.id
          };
        }));
      },
      createProfileFilter: function () {
        var thisProfile = this.getCurrentProfile();
        return function (otherProfile) {
          return otherProfile.active && (otherProfile.id !== thisProfile.id); 
        };
      },
      getCurrentScripts: function () {
        qubit.qtag.data.dao.ScriptDAO.getScripts(this.getCurrentProfile().id, 
          dojo.hitch(this, this.currentScriptsLoaded));
      },
      currentScriptsLoaded: function (scripts) {
        var activeScripts = [];
        dojo.forEach(scripts, function (script) {
          if (script.active) {
            activeScripts.push(script);
          }
        });
        
        this.currentScripts = activeScripts;
        if (this.fromProfile) {
          this.scriptsToCopy = activeScripts;
        } else {
          this.existingScripts = activeScripts;
        }
        
        this.loadScriptsSelectionBox(this.scriptsToCopy);
      },
      getCurrentProfile: function () {
        if (this.fromProfile) {
          return this.fromProfile;
        } else if (this.toProfile) {
          return this.toProfile;
        }
      },
      profileSelected: function (profileId) {
        qubit.qtag.data.dao.ScriptDAO.getScripts(profileId, 
          dojo.hitch(this, this.scriptsLoaded),
          this.currentClientIdSelectedToCopyFrom);
      },      
      otherAccountSelected: function (clientId) {
        qubit.qtag.data.dao.ProfileDAO.getProfiles(
          dojo.hitch(this, this.doPopulateProfileDropDown),
          clientId
        );
        this.currentClientIdSelectedToCopyFrom = clientId;
      },
      scriptsLoaded: function (scripts) {
        var text, duplicates, activeScripts;
        activeScripts = [];
        
        dojo.forEach(scripts, function (script) {
          if (script.active) {
            activeScripts.push(script);
          }
        });
        
        if (this.toProfile) {
          this.scriptsToCopy = activeScripts;
        } else {
          this.existingScripts = activeScripts;
        }
        
        
        text = "This container has " + activeScripts.length + " scripts. ";
        duplicates = this.getDuplicateScripts(activeScripts);
        if (duplicates.length > 0) {
          if (duplicates.length === 1) {
            text += "One already exists here: " + duplicates[0].name;
          } else {
            text += duplicates.length + " already exist here: ";
            text += dojo.map(_.first(duplicates, -1), function (s) {
              return s.name;
            }).join(', ');
            text += ' and ' + _.last(duplicates).name;
          }
          text += '. Existing ones with the same names will be overwritten.';
        }
        this.loadScriptsSelectionBox(this.scriptsToCopy);
        qubit.Util.setText(this.profileInfo, text);
      },
      getDuplicateScripts: function (scripts) {
        var dupes = [];
        dojo.forEach(this.currentScripts, function (cs) {
          if (dojo.some(scripts, 
              function (s) {
                return cs.name === s.name;
              })) {
            dupes.push(cs);
          }
        });
        return dupes;
      },
      saveButtonClicked: function () {
        var i;
        if (this.scriptsToCopy.length === 0) {
          this.hide();
        }
        this.saveButton.set("disabled", true);
        
        if (this.fromProfile) {
          this.fromProfileId = this.fromProfile.id;
        } else {
          this.fromProfileId = this.otherProfiles.getValue();
        }
        if (this.toProfile) {
          this.toProfileId = this.toProfile.id;
        } else {
          this.toProfileId = this.otherProfiles.getValue();
        }
        this.savesFinished = 0;
        
        this.scriptsToCopyQueue = this.scriptsToCopy.slice();
        
        if (this.singleScriptSelectedToCopy === null) {
          this.nextScripts = this.scriptsToCopyQueue.slice();
        } else {
          this.nextScripts = [];
          for (i = 0; i < this.scriptsToCopy.length; i = i + 1) {
            if (this.scriptsToCopy[i].id === 
                this.singleScriptSelectedToCopy) {
              this.nextScripts.push(this.scriptsToCopy[i]);
            }
            this.scriptsToCopyQueue = this.nextScripts.slice();
          }
        }
        if (this.nextScripts.length > 0) {
          this.copyNext(this.nextScripts.splice(0, 1)[0]);
        } else {
          qubit.DefaultNotificationsMgr.done("saving-copier",
            "No scripts could be selected or copied", 1000);
          this.saveButton.set("disabled", false);
        }
      },
      copyNext: function (next) {
        qubit.DefaultNotificationsMgr.notify("saving-copier", 
          "Copying " + next.name + " ...");
        if (next) {
          qubit.qtag.data.dao.ScriptDAO.getScript(this.fromProfileId, 
            next.filterGroupId, next.id, 
            undefined, this.currentClientIdSelectedToCopyFrom)
            .then(dojo.hitch(this, function (script) {
              this.moveScript(script, this.fromProfileId, this.toProfileId, 
                this.copyDeps.checked, this.currentClientIdSelectedToCopyFrom);
            }));
        }
      },
      moveComplete: function (toProfileId) {
        try {
          var name = this.scriptsToCopyQueue[this.savesFinished].name;
          qubit.DefaultNotificationsMgr.done("saving-copier" + new Date(), 
            "Copy complete for: " + name, 1000);
        } catch (ex) {
          
        }
        this.savesFinished += 1;
        if (this.savesFinished === this.scriptsToCopyQueue.length) {
          this.checkConsent(toProfileId);
          this.hide();
          qubit.DefaultNotificationsMgr.done("saving-copier",
            "All copying done. ", 2000);
        } else {
          this.copyNext(this.nextScripts.splice(0, 1)[0]);
        }
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
      },
      hide: function () {
        this.popup.destroy();
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/qtag/data/model/UniversalVar>

/*global qubit */ 
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.dao._UniversalVarDAO", null, {
    getUniversalVariables: function () {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/universalvar",
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler
      }).then(dojo.hitch(this, this.getUniversalVarLoaded));
    },
    getUniversalVarLoaded: function (universalVars) {
      return dojo.map(universalVars, this.createUniversalVarModel);
    },
    addUniversalVariable: function (name, jsName, description) {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/universalvar" + "?f=" + new Date().valueOf(),
        content: {
          name: name, 
          jsName: jsName, 
          description: description
        },
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler
      }).then(dojo.hitch(this, this.createUniversalVarModel));
    },
    createUniversalVarModel: function (universalVar) {
      return new qubit.qtag.data.model.UniversalVar(
        universalVar.id, 
        universalVar.name,
        universalVar.description,
        universalVar.jsName
      );
    }
  }); 
  qubit.qtag.data.dao.UniversalVarDAO = 
    new qubit.qtag.data.dao._UniversalVarDAO();
});
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/data/model/Script>
//= require <qubit/qtag/data/dao/FilterGroupDAO>

/*global qubit */ 
dojo.require("dojox.lang.functional");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.dao._ScriptDAO", null, {
    getScriptWithName: function (profileId, name, cb) {
      this.getScripts(profileId, function (scripts) {
        if (cb) {
          var result;
          dojo.forEach(scripts, function (script) {
            if (script.name === name) {
              result = script;
            }
          });
          cb(result);
        }
      });
    },
    getScripts: function (profileId, cb, clientId) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + (clientId || qubit.data.UserManager.client.id) + 
          "/profile/" + profileId + 
          "/script",
        handleAs: "json",
        preventCache: true,
        load: dojo.hitch(this, 
          dojo.partial(this.getScriptsLoaded, cb)),
        error: qubit.globalErrorHandler
      });
    },
    getScriptsLoaded: function (cb, scripts) {
      cb(dojo.map(scripts, dojo.hitch(this, function (scriptData) {
        return this.createScriptModel(scriptData[0], scriptData[1]);
      })));
    },
    createScriptModel: function (filterGroupId, script) {
      return new qubit.qtag.data.model.Script(
        script.id, 
        script.masterId,
        script.name,
        filterGroupId,
        script.active,
        script.async,
        script.usesDocWrite,
        script.locationId, 
        script.positionId, 
        script.locationDetail, 
        script.dedupe,
        script.needsConsent,
        script.parentDependencies,
        script.childDependencies,
        script.version,
        script.locked
      );
    },
    getScript: function (profileId, filterGroupId, scriptId, cb, clientId) {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + (clientId || qubit.data.UserManager.client.id) + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + "/script/" + scriptId,
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler
      }).then(dojo.hitch(this, function (script) {
        script.filterGroupId = filterGroupId;
        if (cb) {
          cb(script);
        }
        return script;
      }));
    },
    createCustomScript: function (profileId, name, active, url, pre, post, html,
        async, usesDocWrite, locationId, positionId, locationDetailId, 
        dedupe, needsConsent, cb, scriptTimeout, locked) {
      qubit.qtag.data.dao.FilterGroupDAO.createFilterGroup(profileId, name,
        dojo.hitch(this, dojo.partial(this.filterGroupCreatedForCustomScript, 
          profileId, name, active, url, pre, post, html, async, usesDocWrite, 
          locationId, positionId, locationDetailId, dedupe, needsConsent,
          scriptTimeout, locked, cb)));
    },
    filterGroupCreatedForCustomScript: function (profileId, 
        name, active, url, pre, post, html, async, usesDocWrite, 
        locationId, positionId, locationDetailId, dedupe, needsConsent,
        scriptTimeout, locked, cb, filterGroup) {
      this.doCreateCustomScript(profileId, filterGroup.id,
          name, active, url, pre, post, html, async, usesDocWrite,
          locationId, positionId, locationDetailId, dedupe, needsConsent,
          scriptTimeout, locked, cb);
    },
    doCreateCustomScript: function (profileId, filterGroupId, name, active, url,
        pre, post, html, async, usesDocWrite, 
        locationId, positionId, locationDetailId, dedupe, needsConsent,
        scriptTimeout, locked, cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + "/script" + 
          "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          name: name,
          active: active,
          url: url,
          pre: pre,
          post: post,
          html: html,
          async: async,
          locked: locked,
          usesDocWrite: usesDocWrite,
          locationId: locationId,
          positionId: positionId,
          locationDetail: locationDetailId,
          dedupe: dedupe,
          needsConsent: needsConsent,
          scriptTimeout: scriptTimeout
        },
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.createCustomScriptLoaded, 
          filterGroupId, cb)),
        error: this.errorHandler || qubit.globalErrorHandler 
      });
    },
    createCustomScriptLoaded: function (filterGroupId, cb, script) {
      script.filterGroupId = filterGroupId;
      if (cb) {
        cb(script);
      }
    },
    saveCustomScript: function (profileId, filterGroupId, scriptId, name,
        active, url, pre, post, html, async, usesDocWrite, locationId, 
        positionId, locationDetailId, dedupe, needsConsent, cb, scriptTimeout,
        locked) {
      dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + "/script/" + scriptId + 
          "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          name: name,
          active: (active === true) ? "true" : 
            ((active === false) ? "false" : ""),
          async: (async === true) ? "true" : ((async === false) ? "false" : ""),
          locked: locked,
          usesDocWrite: (usesDocWrite === true) ? "true" : 
            ((usesDocWrite === false) ? "false" : ""),
          url: url,
          pre: pre,
          post: post,
          html: html,
          locationId: locationId,
          positionId: positionId,
          locationDetail: locationDetailId,
          dedupe: dedupe,
          needsConsent: needsConsent,
          scriptTimeout: scriptTimeout
        },
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.saveCustomScriptLoaded, cb)),
        error: this.errorHandler || qubit.globalErrorHandler
      });
    },
    saveCustomScriptLoaded: function (cb) {
      if (cb) {
        cb();
      }
    },
    addParam: function (profileId, filterGroupId, scriptId, paramName, token, 
        universalVarId, customVarId, defaultValue) {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + 
          "/script/" + scriptId + 
          "/customparam" + "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          name: paramName,
          token: token,
          universalVarId: universalVarId,
          customVarId: customVarId,
          defaultValue: defaultValue
        },
        handleAs: "json",
        error: qubit.globalErrorHandler 
      });
    },
    saveParam: function (profileId, filterGroupId, scriptId, paramId, name, 
        token, universalVarId, customVarId, defaultValue) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + 
          "/script/" + scriptId + 
          "/customparam/" + paramId + "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          name: name,
          token: token,
          universalVarId: universalVarId,
          customVarId: customVarId,
          defaultValue: defaultValue
        },
        handleAs: "json",
        error: qubit.globalErrorHandler 
      });
    },
    deleteParam: function (profileId, filterGroupId, scriptId, paramId) {
      return dojo.xhrDelete({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + 
          "/script/" + scriptId + 
          "/customparam/" + paramId + "?f=" + new Date().valueOf(),
        preventCache: true,
        handleAs: "json",
        error: qubit.globalErrorHandler 
      });
    },
    createTemplatedScript: function (profileId, name, active, scriptTemplateId, 
        paramValues, dedupe, needsConsent, cb, scriptTimeout, locked) {
      //convert params to a version suitable for REST
      var convertedParams = {};
      dojo.forEach(paramValues, function (paramValue) {
        convertedParams[paramValue.id] = paramValue;
      });
      qubit.qtag.data.dao.FilterGroupDAO.createFilterGroup(profileId, name,
          dojo.hitch(this, 
            dojo.partial(this.filterGroupCreatedForTemplatedScript,  
            profileId, name, active, scriptTemplateId, convertedParams, 
            dedupe, needsConsent, scriptTimeout, locked, cb)));
    },
    filterGroupCreatedForTemplatedScript: function (profileId, name, active,
        scriptTemplateId, paramValues, dedupe, needsConsent, scriptTimeout,
        locked, cb, filterGroup) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroup.id + "/script" + 
          "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          name: name,
          active: active,
          locked: locked,
          scriptId: scriptTemplateId,
          params: dojo.toJson(paramValues),
          dedupe: dedupe,
          needsConsent: needsConsent,
          scriptTimeout: scriptTimeout
        },
        handleAs: "json",
        load: dojo.hitch(this, 
          dojo.partial(this.createTemplateScriptLoaded, filterGroup.id, cb)),
        error: this.errorHandler || qubit.globalErrorHandler 
      });
    },
    createTemplateScriptLoaded: function (filterGroupId, cb, script) {
      script.filterGroupId = filterGroupId;
      if (cb) {
        cb(script);
      }
    },
    saveTemplatedScript: function (profileId, filterGroupId, scriptId, name,
      active, params, dedupe, needsConsent, cb, scriptTimeout, locked) {
      dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + 
          "/script/" + scriptId + "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          name: name,
          active: active,
          dedupe: dedupe,
          locked: locked,
          needsConsent: needsConsent,
          scriptTimeout: scriptTimeout
        },
        handleAs: "json",
        load: dojo.hitch(this, 
          dojo.partial(this.saveTemplateScriptNameLoaded, cb)),
        error: this.errorHandler || qubit.globalErrorHandler
      });

      dojo.forEach(params, function (param) {
        var content = {};
        if (param.customVarId) {
          content.customVarId = param.customVarId;
        } else {
          content.universalVarId = param.universalVarId;
        }
        
        content.defaultValue = param.defaultValue;
        
        dojo.xhrPut({
          url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
            "/client/" + qubit.data.UserManager.client.id + 
            "/profile/" + profileId + 
            "/filtergroup/" + filterGroupId + 
            "/script/" + scriptId + 
            "/param/" + param.id + "?f=" + new Date().valueOf(),
          preventCache: true,
          content: content,
          handleAs: "json",
          load: dojo.hitch(this, 
            dojo.partial(this.saveTemplateScriptParamLoaded, cb)),
          error: this.errorHandler || qubit.globalErrorHandler
        });
      });
    },
    saveTemplateScriptNameLoaded: function (cb) {
      if (cb) {
        cb();
      }
    },
    saveTemplateScriptParamLoaded: function (cb) {
      if (cb) {
        cb();
      }
    },
    convertToTemplated: function (profileId, filterGroupId, scriptId,
        templateId) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + "/script/" + scriptId +
          "/convertToTemplated" + "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          templateId: templateId
        },
        handleAs: "json",
        error: qubit.globalErrorHandler 
      }).then(function (script) {
        script.filterGroupId = filterGroupId;
        return script;
      });
    },
    convertToCustom: function (profileId, filterGroupId, scriptId) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + "/script/" + scriptId +
          "/convertToCustom" + "?f=" + new Date().valueOf(),
        preventCache: true,
        handleAs: "json",
        error: qubit.globalErrorHandler 
      }).then(function (script) {
        script.filterGroupId = filterGroupId;
        return script;
      });
    },
    activateScript: function (profileId, filterGroupId, scriptId, cb) {
      dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + "/script/" + scriptId + 
          "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          active: true
        },
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.activateScriptLoaded, cb)),
        error: qubit.globalErrorHandler
      });
    },
    activateScriptLoaded: function (cb) {
      if (cb) {
        cb();
      }
    },
    setABTestsLock: function (profileId, filterGroupId, scriptId, locked, cb) {
      dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + "/script/" + scriptId + 
          "/locked?f=" + new Date().valueOf(),
        preventCache: true,
        handleAs: "json",
        content: {
          locked: locked
        },
        load: dojo.hitch(this, dojo.partial(this.setABTestsLockLoaded, cb)),
        error: qubit.globalErrorHandler
      });
    },
    setABTestsLockLoaded: function (cb) {
      if (cb) {
        cb();
      }
    },
    inactivateScript: function (profileId, filterGroupId, scriptId, cb) {
      dojo.xhrDelete({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + "/script/" + scriptId + 
          "?f=" + new Date().valueOf(),
        preventCache: true,
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.inactivateScriptLoaded, cb)),
        error: qubit.globalErrorHandler
      });
    },
    inactivateScriptLoaded: function (cb) {
      if (cb) {
        cb();
      }
    },
    addScriptDependency: function (profileId, filterGroupId, scriptId, 
        parentFilterGroupId, parentScriptId) {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + "/script/" + scriptId + 
          "/dependency" + "?f=" + new Date().valueOf(),
        preventCache: true,
        handleAs: "json",
        content: {
          filterGroupId: parentFilterGroupId,
          scriptId: parentScriptId
        },
        error: qubit.globalErrorHandler
      });
    },
    removeScriptDependency: function (profileId, filterGroupId, scriptId, 
        parentScriptId) {
      return dojo.xhrDelete({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId + "/script/" + scriptId + 
          "/dependency/" + parentScriptId + "?f=" + new Date().valueOf(),
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler
      });
    },
    moveScript: function (fromProfileId, fromFilterGroupId, 
      scriptId, toProfileId, copyDependencies, fromClientId) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + (fromClientId || qubit.data.UserManager.client.id) + 
          "/profile/" + fromProfileId + 
          "/filtergroup/" + fromFilterGroupId + "/script/" + scriptId + 
          "/copy/" + toProfileId + "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          copyDependencies: copyDependencies
        },
        handleAs: "json",
        error: qubit.globalErrorHandler
      });
    }
  });
  qubit.qtag.data.dao.ScriptDAO = new qubit.qtag.data.dao._ScriptDAO();
});
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/data/model/Vendor>

/*global qubit */ 
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.dao._VendorDAO", null, {
    addVendor: function (name, description, imageUrl) {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/vendor" + "?f=" + new Date().valueOf(),
        content: {
          name: name, 
          description: description,
          imageUrl: imageUrl
        },
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler 
      }); 
    },
    saveVendor: function (id, name, description, imageUrl) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/vendor/" + id + "?f=" + new Date().valueOf(),
        content: {
          name: name, 
          description: description,
          imageUrl: imageUrl
        },
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler 
      }).then(function () {
        return {
          id: id,
          name: name,
          description: description
        };
      }); 
    },
    getVendors: function (cb) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/vendor",
        handleAs: "json",
        preventCache: true,
        load: dojo.hitch(this, dojo.partial(this.getVendorsLoaded, cb)),
        error: qubit.globalErrorHandler
      });
    },
    getVendorsLoaded: function (cb, vendors) {
      cb(dojo.map(vendors, this.createVendorModel));
    },
    createVendorModel: function (vendor) {
      return new qubit.qtag.data.model.Vendor(
        vendor.id, 
        vendor.name,
        vendor.description,
        vendor.imageUrl
      );
    }
  });
  qubit.qtag.data.dao.VendorDAO = 
    new qubit.qtag.data.dao._VendorDAO();
});
  
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/data/model/Category>

/*global qubit */ 
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.dao._CategoryDAO", null, {
    getCategories: function (cb) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/category",
        handleAs: "json",
        preventCache: true,
        load: dojo.hitch(this, dojo.partial(this.getCategoriesLoaded, cb)),
        error: qubit.globalErrorHandler
      });
    },
    getCategoriesLoaded: function (cb, categories) {
      cb(dojo.map(categories, this.createCategoryModel));
    },
    createCategoryModel: function (category) {
      return new qubit.qtag.data.model.Category(
        category.id, 
        category.name
      );
    }
  });
  qubit.qtag.data.dao.CategoryDAO = 
    new qubit.qtag.data.dao._CategoryDAO();
});
  
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/data/model/FilterGroup>

/*global qubit */ 
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.dao._FilterGroupDAO", null, {
    getFilterGroups: function (profileId, cb) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup",
        handleAs: "json",
        preventCache: true,
        load: dojo.hitch(this, dojo.partial(this.getFilterGroupsLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    getFilterGroupsLoaded: function (cb, filterGroups) {
      if (cb) {
        cb(dojo.map(filterGroups, dojo.hitch(this, 
            this.createFilterGroupModel)));
      }
    },
    createFilterGroupModel: function (filterGroup) {
      return new qubit.qtag.data.model.FilterGroup(
        filterGroup.id,
        filterGroup.name,
        filterGroup.priority
      );
    },
    createFilterGroup: function (profileId, name, cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup" +
          "?f=" + new Date().valueOf(),
        content: {
          name: encodeURIComponent(name),
          priority: 1
        },
        preventCache: true,
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.createFilterGroupLoaded, cb)),
        error: this.errorHandler || qubit.globalErrorHandler 
      });
    },
    createFilterGroupLoaded: function (cb, filterGroup) {
      if (cb) {
        cb(filterGroup);
      }
    }
  });
  qubit.qtag.data.dao.FilterGroupDAO = 
    new qubit.qtag.data.dao._FilterGroupDAO();
});
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/data/model/ScriptTemplate>
//= require <qubit/qtag/data/model/ScriptParam>

/*global qubit */ 
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.dao._ScriptTemplateDAO", null, {
    getScriptTemplates: function (categoryId, cb) {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/script?category=" + categoryId,
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler 
      }).then(dojo.hitch(this, dojo.partial(this.getScriptTemplateLoaded, cb)));
    },
    getScriptTemplateLoaded: function (cb, scriptTemplates) {
      var altCounter = 0;
      var mapByMasterSourceLocation = {};
      //process versions
      if (scriptTemplates) {
        for (var i = 0; i < scriptTemplates.length; i++) {
          var template = scriptTemplates[i];
          var msl = template.masterSourcesLocation || template.sourcesLocation;
          if (msl) {
            if (!mapByMasterSourceLocation[msl]) {
              mapByMasterSourceLocation[msl] = [];
            }

            if (template.masterSourcesLocation) {//not empty string
              mapByMasterSourceLocation[msl].push(template); 
            }
          } else {
            mapByMasterSourceLocation["uknown" + (altCounter++)] = [
              template
            ];
          }
        }
      }
      
      //temporal solution, as listing is still flat:
      var versionedScriptTemplates = [];
      
      for (var prop in mapByMasterSourceLocation) {
        if (mapByMasterSourceLocation.hasOwnProperty(prop)) {
          var ref = mapByMasterSourceLocation[prop];
          var versions = ref;
          for (var j = 0; j < versions.length; j++) {
            versionedScriptTemplates.push(versions[j]);
          }
          if (versions.length === 1) {
            versions[0].isOneVersionOnly = true;
          }
        }
      }
      
      return dojo.map(versionedScriptTemplates, this.createScriptTemplateModel);
    },
    createScriptTemplateModel: function (scriptTemplate) {
      var u;// = undefined;
      var template = new qubit.qtag.data.model.ScriptTemplate(
        scriptTemplate.id,
        scriptTemplate.name,
        scriptTemplate.description,
        scriptTemplate.imageUrl,
        scriptTemplate.vendorId,
        u, u, u, u, u, u, u, u, u, u, u, u,
        scriptTemplate.version,
        scriptTemplate.script,
        scriptTemplate.sourcesLocation,
        scriptTemplate.masterSourcesLocation,
        scriptTemplate.isOneVersionOnly,
        scriptTemplate.locked
      );
      return template;
    },
    getScriptTemplateDetailForTemplate: function (scriptTemplate, cb) {
      var scriptId = scriptTemplate.id;
      var _this = this;
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/script/" + scriptId,
        handleAs: "json",
        preventCache: true,
        load: function (scriptTemplateData) {
          var template = _this.processTemplateDetail(scriptTemplateData);
          template.isOneVersionOnly = scriptTemplate.isOneVersionOnly;
          if (cb) {
            cb(template);
          }
        },
        error: qubit.globalErrorHandler 
      });
    },
    getScriptTemplateDetail: function (scriptId, cb) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/script/" + scriptId,
        handleAs: "json",
        preventCache: true,
        load: dojo.hitch(this, 
            dojo.partial(this.getScriptTemplateDetailLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    getScriptTemplateDetailLoaded: function (cb, scriptTemplate) {
      if (cb) {
        cb(this.processTemplateDetail(scriptTemplate));
      }
    },
    processTemplateDetail: function (scriptTemplate) {
      var priv = 'private';
      var st = new qubit.qtag.data.model.ScriptTemplate(
          scriptTemplate.id, 
          scriptTemplate.name, 
          scriptTemplate.description,
          scriptTemplate.imageUrl,
          scriptTemplate.vendorId,
          scriptTemplate.url,
          scriptTemplate.html,
          scriptTemplate.pre,
          scriptTemplate.post,
          scriptTemplate.async,
          scriptTemplate.usesDocWrite,
          scriptTemplate[priv],
          scriptTemplate.locationId,
          scriptTemplate.positionId,
          scriptTemplate.locationDetail,
          scriptTemplate.categoryId,
          dojo.map(scriptTemplate.parameters, this.createScriptParam),
          scriptTemplate.version,
          scriptTemplate.script,
          scriptTemplate.sourcesLocation,
          scriptTemplate.masterSourcesLocation,
          scriptTemplate.locked);
      return st;
    },
    createScriptParam: function (scriptParam) {
      return new qubit.qtag.data.model.ScriptParam(
        scriptParam.id,
        scriptParam.token,
        scriptParam.paramName,
        scriptParam.description,
        scriptParam.jsName,
        scriptParam.valueName,
        scriptParam.universalVarId,
        scriptParam.hasDefault
      );
    },
    addScriptTemplates: function (name, description, categoryId, vendorId, cb) {
//      return saveScriptTemplates.dojo.xhrPost({
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/script" + "?f=" + new Date().valueOf(),
        content: {
          name: name, 
          description: description, 
          categoryId: categoryId,
          vendorId: vendorId
        },
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler 
      });
    },
    saveScriptTemplates: function (id, name, description, imageUrl, url, 
        script, pre, post, html, async, usesDocWrite, isPrivate, locationId, positionId,
        locationDetail, categoryId, vendorId) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/script/" + id + "?f=" + new Date().valueOf(),
        content: {
          name: name,
          description: description,
          imageUrl: imageUrl,
          url: url,
          script: script,
          pre: pre,
          post: post,
          html: html,
          locationId: locationId,
          positionId: positionId,
          locationDetail: locationDetail,
          async: async,
          categoryId: categoryId,
          vendorId: vendorId,
          usesDocWrite: usesDocWrite,
          "private": isPrivate
        },
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler 
      });
    },
    addScriptParam: function (scriptTemplateId, name, description, 
        token, universalVarId, canHaveDefaults) {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/script/" + scriptTemplateId + "/param" + 
          "?f=" + new Date().valueOf(),
        content: {
          name: name,
          description: description,
          token: token,
          universalVarId: universalVarId,
          canHaveDefaults: canHaveDefaults
        },
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler 
      });
    },
    saveScriptParam: function (scriptTemplateId, paramId, name, description, 
        token, universalVarId, canHaveDefaults) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/script/" + scriptTemplateId + "/param/" + paramId + 
          "?f=" + new Date().valueOf(),
        content: {
          name: name,
          description: description,
          token: token,
          universalVarId: universalVarId,
          canHaveDefaults: canHaveDefaults
        },
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler 
      });
    },
    removeScriptParam: function (scriptTemplateId, paramId) {
      return dojo.xhrDelete({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/script/" + scriptTemplateId + "/param/" + paramId + 
          "?f=" + new Date().valueOf(),
        preventCache: true,
        error: qubit.globalErrorHandler 
      });
    }
  });
  qubit.qtag.data.dao.ScriptTemplateDAO = 
    new qubit.qtag.data.dao._ScriptTemplateDAO();
});
  
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/data/UserManager>

/*global qubit */ 
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.dao._StatsDAO", null, {
    mocking: false,
    getClientStats: function (start, end, group, cb) {
      if (this.mocking) {
        setTimeout(dojo.hitch(this, function () {
          cb(this.getMockStats(start, end, group));
        }), 100);
      } else {
        dojo.xhrGet({
          url: qubit.data.Urls.qtagStatsDomain + 
            "/client/" + qubit.data.UserManager.client.id + 
            "/stats?start=" + start.getTime() + "&" +
            "end=" + end.getTime() + "&" +
            "groupby=" + group,
          handleAs: "json",
          preventCache: true,
          load: dojo.hitch(this, dojo.partial(this.getClientStatsLoaded, cb)),
          error: dojo.hitch(this, function (msg, e) {
            if (e.xhr.status === 500) {
              cb(this.getEmptyStats(start, end, group));
            } else if (e.xhr.status === 404) {
              cb(this.getMockStats(start, end, group));
            } else {
              qubit.globalErrorHandler(msg, e);
            }
          })
        });
      }
    },
    getClientStatsLoaded: function (cb, stats) {
      this.formatStats(stats);
      if (cb) {
        cb(stats);
      }
    },
    getProfileStats: function (profileId, start, end, group, cb) {
      if (this.mocking) {
        setTimeout(dojo.hitch(this, function () {
          cb(this.getMockStats(start, end, group));
        }), 100);
      } else {
        dojo.xhrGet({
          url: qubit.data.Urls.qtagStatsDomain + 
            "/client/" + qubit.data.UserManager.client.id + 
            "/profile/" + profileId + 
            "/stats?start=" + start.getTime() + "&" +
            "end=" + end.getTime() + "&" +
            "groupby=" + group,
          handleAs: "json",
          preventCache: true,
          load: dojo.hitch(this, dojo.partial(this.getProfileStatsLoaded, cb)),
          error: dojo.hitch(this, function (msg, e) {
            if (e.xhr.status === 500) {
              cb(this.getEmptyStats(start, end, group));
            } else if (e.xhr.status === 404) {
              cb(this.getMockStats(start, end, group));
            } else {
              qubit.globalErrorHandler(msg, e);
            }
          })
        });
      }
    },
    getProfileStatsLoaded: function (cb, stats) {
      this.formatStats(stats);
      if (cb) {
        cb(stats);
      }
    },
    getMockStats: function (start, end, group) {
      var i, startPeriod, endPeriod, data = [];
      for (i = 0; i < 12; i += 1) {
        startPeriod = new Date(start.getTime());
        endPeriod = new Date(start.getTime());
        if (group === "week") {
          startPeriod.setDate(start.getDate() + i * 7);
          endPeriod.setDate(start.getDate() + (i + 1) * 7);
        } else if (group === "day") {
          startPeriod.setDate(start.getDate() + i);
          endPeriod.setDate(start.getDate() + i + 1);
        }
        if (endPeriod.getTime() > end.getTime()) {
          break;
        } 

        data.push({
          start: startPeriod,
          end: endPeriod,
          timesServed: parseInt(100 + (i * 100) + (Math.random() * 100), 10),
          avgLoadingTime: Math.random() * 100,
          pagesServedOn: parseInt(1 + (i * 7) + (Math.random() * 7), 10)
        });
      }
      return data;
    },
    getEmptyStats: function (start, end, group) {
      var i, startPeriod, endPeriod, data = [];
      for (i = 0; i < 12; i += 1) {
        startPeriod = new Date(start.getTime());
        endPeriod = new Date(start.getTime());
        if (group === "week") {
          startPeriod.setDate(start.getDate() + i * 7);
          endPeriod.setDate(start.getDate() + (i + 1) * 7);
        } else if (group === "day") {
          startPeriod.setDate(start.getDate() + i);
          endPeriod.setDate(start.getDate() + i + 1);
        }
        if (endPeriod.getTime() > end.getTime()) {
          break;
        } 

        data.push({
          start: startPeriod,
          end: endPeriod,
          timesServed: 0,
          avgLoadingTime: 0,
          pagesServedOn: 0
        });
      }
      return data;
    },
    getScriptStats: function (profileId, scriptId, start, end, group, cb) {
      if (this.mocking) {
        setTimeout(dojo.hitch(this, function () {
          cb(this.getMockStats(start, end, group));
        }), 100);
      } else {
        dojo.xhrGet({
          url: qubit.data.Urls.qtagStatsDomain + 
            "/client/" + qubit.data.UserManager.client.id + 
            "/profile/" + profileId +  
            "/script/" + scriptId + 
            "/stats?start=" + start.getTime() + "&" +
            "end=" + end.getTime() + "&" +
            "groupby=" + group,
          handleAs: "json",
          preventCache: true,
          load: dojo.hitch(this, dojo.partial(this.getScriptStatsLoaded, cb)),
          error: dojo.hitch(this, function (msg, e) {
            if (e.xhr.status === 500) {
              cb(this.getEmptyStats(start, end, group));
            } else if (e.xhr.status === 404) {
              cb(this.getMockStats(start, end, group));
            } else {
              qubit.globalErrorHandler(msg, e);
            }
          })
        });
      }
    },
    getScriptStatsLoaded: function (cb, stats) {
      this.formatStats(stats);
      if (cb) {
        cb(stats);
      }
    },
    formatStats: function (stats) {
      dojo.forEach(stats, function (stat) {
        stat.start = new Date(stat.start);
        stat.end = new Date(stat.end);
      });
    }
  });
  qubit.qtag.data.dao.StatsDAO = new qubit.qtag.data.dao._StatsDAO();
  qubit.qtag.data.dao.StatsDAO.daily = "day";
  qubit.qtag.data.dao.StatsDAO.weekly = "week";
  qubit.qtag.data.dao.StatsDAO.monthly = "month";
  qubit.qtag.data.dao.StatsDAO.yearly = "year";
  qubit.qtag.data.dao.StatsDAO.all = "all";
});
  
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/data/model/Filter>

/*global qubit */ 
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.dao._FilterDAO", null, {
    getFilters: function (profileId, filterGroupId, cb) {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId +
          "/filter",
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler 
      }).then(dojo.hitch(this, function (filters) {
        var filterModels = dojo.map(filters, this.createFilterModel);
        if (cb) {
          cb(filterModels);
        }
        return filterModels;
      }));
    },
    createFilter: function (profileId, filterGroupId, 
        name, pattern, patternType, priority, filterType, cb) {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId +
          "/filter" + "?f=" + new Date().valueOf(),
        content: {
          patternName: name,
          patternText: pattern,
          patternTypeId: patternType,
          priority: priority,
          filterTypeId: filterType
        },
        handleAs: "json",
        preventCache: true,
        error: this.errorHandler || qubit.globalErrorHandler 
      }).then(dojo.hitch(this, function (filter) {
        var filterModel = this.createFilterModel(filter);
        if (cb) {
          cb(filterModel);
        }
        return filterModel;
      }));
    },
    saveFilter: function (profileId, filterGroupId, filterId, 
        name, pattern, patternType, priority, filterType, cb) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId +
          "/filter/" + filterId + 
          "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          patternName: name,
          patternText: pattern,
          patternTypeId: patternType,
          priority: priority,
          filterTypeId: filterType
        },
        handleAs: "json",
        error: this.errorHandler || qubit.globalErrorHandler 
      }).then(function () {
        if (cb) {
          cb();
        }
      });
    },
    createFilterModel: function (filter) {
      return new qubit.qtag.data.model.Filter(
        filter.id, 
        filter.pattern.name,
        filter.pattern.pattern,
        filter.pattern.patternTypeId,
        filter.priority,
        filter.filterTypeId
      );
    },
    deleteFilter: function (profileId, filterGroupId, filterId, cb) {
      return dojo.xhrDelete({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/filtergroup/" + filterGroupId +
          "/filter/" + filterId + "?f=" + new Date().valueOf(),
        preventCache: true,
        handleAs: "json",
        error: qubit.globalErrorHandler 
      }).then(function () {
        if (cb) {
          cb();
        }
      });
    }
  });
  qubit.qtag.data.dao.FilterDAO = 
    new qubit.qtag.data.dao._FilterDAO();
  //Filter Types
  qubit.qtag.data.dao.FilterDAO.INCLUDE = 1;
  qubit.qtag.data.dao.FilterDAO.EXCLUDE = 2;
  
  //Pattern Types
  qubit.qtag.data.dao.FilterDAO.ALL = 1;
  qubit.qtag.data.dao.FilterDAO.SUBSTRING = 2;
  qubit.qtag.data.dao.FilterDAO.REGEX = 3;
  qubit.qtag.data.dao.FilterDAO.EXACT_MATCH = 4;
  qubit.qtag.data.dao.FilterDAO.SESSION = 100;

});
  
//= require <qubit/GLOBAL>
//= require <qubit/qtag/data/dao/ScriptDAO>
//= require <qubit/qtag/ConsentDefaults>


dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.dao._ConsentDAO", null, {
    // Find the consent script for the current container
    // If it cannot locate it, create a new consent script
    // with the default setting
    findOrCreateConsentScript: function (profileId, cb) {
      this.getConsent(profileId, dojo.hitch(this, 
          dojo.partial(this.doFindOrCreateConsentScript, profileId, cb)));
    },
    getConsent: function (profileId, cb) {
      qubit.qtag.data.dao.ScriptDAO.getScriptWithName(
        profileId,
        this.defaultConsentScriptName,
        cb
      );
    },
    doFindOrCreateConsentScript: function (profileId, cb, script) {
      var consentConfig;
      if (!script) {
        this.createConsent(profileId, 
          dojo.hitch(this, dojo.partial(this.consentCreated, cb, profileId)));
      } else {
        qubit.qtag.data.dao.ScriptDAO.getScript(
          profileId,
          script.filterGroupId,
          script.id,
          dojo.hitch(this, 
            dojo.partial(this.loadConsentScriptConfiguration, cb))
        );
      }
    },
    createConsent: function (profileId, cb) {
      // requires to create a new consent script
      var config = qubit.qtag.ConsentDefaults.defaultConsentScriptConfig();
      qubit.qtag.data.dao.ScriptDAO.createCustomScript(
        profileId,
        qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptName,
        false,
        qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptUrl,
        this.getConsentPreScriptString(config, profileId),
        "",
        "",
        true,
        false,
        0,
        0,
        0,
        false,
        false,
        function (script) {
          cb(script, config);
        }
      );
    },
    consentCreated: function (cb, profileId, script, config) {
      qubit.qtag.data.dao.ScriptDAO.inactivateScript(
        profileId,
        script.filterGroupId,
        script.id,
        dojo.hitch(this, function () {
          script.active = false;
          cb(script, qubit.qtag.ConsentDefaults.defaultConsentScriptConfig());
        })
      );
    },
    // Parse the consent script pre-script to JSON configuration
    loadConsentScriptConfiguration: function (cb, script) {
      var threeParts, twoParts, consentConfig;
      if (!!script && !!script.pre) {
        // Pre contains three parts: ping setup, qcw configuration
        // and additional events
        threeParts = script.pre.split(
          qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptPingSplit
        );
        // Get qcw and additional events
        twoParts = threeParts[threeParts.length - 1]
                .split(qubit.qtag.data.dao.ConsentDAO
                    .defaultConsentScriptEventSplit);
        // Get the qcw configuration in full string
        consentConfig = twoParts[0];

        consentConfig = JSON.parse(
          consentConfig.slice(
            // eliminate the appended variable assigment
            qubit.qtag.data.dao.ConsentDAO
                    .defaultConsentScriptAddition.length - 1,
            // eliminate the trailing ending ; sign
            consentConfig.length - 1
          )
        );
        cb(script, consentConfig);
      }
    },
    saveConsent: function (profileId, consentScript, config, cb) {
      qubit.qtag.data.dao.ScriptDAO.saveCustomScript(
        profileId,
        consentScript.filterGroupId,
        consentScript.id,
        qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptName,
        null,
        qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptUrl,
        this.getConsentPreScriptString(config, profileId),
        "",
        "",
        true,
        false,
        0,
        0,
        0,
        false,
        false,
        cb
      );
    },
    defaultConsentScriptEvents: function () {
      return [
        "qcw.onUserAccept = function (reason) { ",
        "  if (window.opentag_consentGiven) {",
        "    window.opentag_consentGiven();",
        "  }",
        "  if (window._q_ping) {",
        "     window._q_ping(\"consentAccept\", reason); ",
        "  }",
        "};",
        "qcw.onUserDecline = function (reason) { ",
        "  if (window._q_ping) {",
        "    window._q_ping(\"consentDecline\", reason); ",
        "  }",
        "};",
        "qcw.onPostCreate = function (reason) { ",
        "  if (window._q_ping) {",
        "    window._q_ping(\"consentShown\", reason); ",
        "  }",
        "};",
        "qcw.onUserDismiss = function (reason) { ",
        "  if (window._q_ping) {",
        "    window._q_ping(\"consentDismiss\", reason); ",
        "  }",
        "};"
      ].join("\n");
    },
    defaultConsentScriptPingScript: function (profileId) {
      var script = [
        "var _q_pd = document.createElement(\"script\");",
        "_q_pd.src = \"//d3c3cq33003psk.cloudfront.net/PostData.js\";",
        "document.getElementsByTagName(\"head\")[0].appendChild(_q_pd);",
        "var _q_ping = function (type, reason) {",
        "  if (!window._q_) {",
        "    setTimeout(function () { _q_ping(type); }, 100);",
        "  } else {",
        "    window._q_.PostData(\"//pong.qubitproducts.com/s?tid=",
        qubit.data.UserManager.client.id + "_" + profileId,
        "&time=\" + new Date().getTime() + \"",
        "&type=\" + type +\"&r=\" + reason);",
        "  }",
        "};"
      ].join("");
      return script;
    },
    getConsentPreScriptString: function (config, profileId) {
      return [
        this.defaultConsentScriptPingScript(profileId),
        qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptPingSplit,
        qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptAddition,
        JSON.stringify(config),
        ";",
        qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptEventSplit,
        this.defaultConsentScriptEvents()
      ].join("");
    }
  });
  qubit.qtag.data.dao.ConsentDAO = new qubit.qtag.data.dao._ConsentDAO();
  qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptName = "QuBit Consent";
  qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptUrl =
    "d3c3cq33003psk.cloudfront.net/consent/consent-widget-1.1.0.min.js";
  qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptAddition = "var qcw = ";
  qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptPingSplit = "\n//=Q=\n";
  qubit.qtag.data.dao.ConsentDAO.defaultConsentScriptEventSplit = "\n//=E=\n";

});
  
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/data/model/Profile>
//= require <qubit/widget/utils/Utils>

/*global qubit */ 
dojo.addOnLoad(function () {
  var Utils = qubit.widget.utils.Utils;
  dojo.declare("qubit.qtag.data.dao._ProfileDAO", null, {
    getProfiles: function (cb, clientId) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + (clientId || qubit.data.UserManager.client.id) +
          "/profile",
        handleAs: "json",
        preventCache: true,
        load: dojo.hitch(this, dojo.partial(this.getProfilesLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    getProfilesLoaded: function (cb, profiles) {
      cb(dojo.map(profiles, dojo.hitch(this, this.createProfileObject)));
    },
    createProfile: function (name, cookieDomain, zipped, delayDocWrite, cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile" + "?f=" + new Date().valueOf(),
        content: {
          name: name,
          cookieDomain: cookieDomain,
          zipped: zipped,
          delayDocWrite: delayDocWrite
        },
        preventCache: true,
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.createProfileLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    createProfileLoaded: function (cb, profile) {
      if (cb) {
        cb(this.createProfileObject(profile));
      }
    },
    alterProfile: function (profileId, name, cookieDomain, setZipped, 
        setNotZipped, setDelayDocWrite, setDoNotDelayDocWrite, 
        setShowCommitFinishedPrompt, setDontShowCommitFinishedPrompt, 
        maxCookieLength, cb) {
      dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          name: name, 
          cookieDomain: cookieDomain, 
          zipped: setZipped, 
          notZipped: setNotZipped,
          setDelayDocWrite: setDelayDocWrite, 
          setDoNotDelayDocWrite: setDoNotDelayDocWrite,
          setShowCommitFinishedPrompt: setShowCommitFinishedPrompt,
          setDontShowCommitFinishedPrompt: setDontShowCommitFinishedPrompt,
          maxCookieLength: maxCookieLength
        },
        load: dojo.hitch(this, dojo.partial(this.alterProfileLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    alterProfileLoaded: function (cb) {
      if (cb) {
        cb();
      }
    },
    duplicateProfile: function (profileId, name, cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + "?f=" + new Date().valueOf(),
        content: {
          name: name
        },
        preventCache: true,
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.createProfileLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    createProfileObject: function (profile) {
      return new qubit.qtag.data.model.Profile(
        profile.id, 
        profile.name,
        profile.dirty,
        profile.active,
        profile.invalidationToken,
        profile.version,
        profile.cookieDomain,
        profile.zipped,
        profile.delayDocWrite,
        profile.showCommitFinishedPrompt,
        profile.maxCookieLength,
        profile.scriptsToUpdate,
        profile.scriptsVersions
      );
    },
    saveProfile: function (profileId, cb) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/scriptwriter" + "?f=" + new Date().valueOf(),
        preventCache: true,
        error: dojo.hitch(this, dojo.partial(this.profileWriteError, cb)) 
      }).then(function (invalidationToken) {
        if (invalidationToken === qubit.qtag.data.dao.ProfileDAO.WriteFailed) {
          cb(qubit.qtag.data.dao.ProfileDAO.WriteFailed);
        } else if (invalidationToken === 
                qubit.qtag.data.dao.ProfileDAO.WriteLocked) {
          cb(qubit.qtag.data.dao.ProfileDAO.WriteLocked);
        } else if (cb) {
          cb(invalidationToken);
        }
        return invalidationToken;
      });
    },
    profileWriteError: function (cb, x, error) {
      if (error.xhr.status === 403) {
        cb(qubit.qtag.data.dao.ProfileDAO.WriteDenied);
      } else {
        qubit.globalErrorHandler(error); 
      }
    },
    revertProfile: function (profileId, cb) {
      dojo.xhrDelete({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/changes" + "?f=" + new Date().valueOf(),
        preventCache: true,
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.profileReverted, cb)),
        error: qubit.globalErrorHandler
      });
    },
    profileReverted: function (cb, obj) {
      if (cb) {
        cb(obj);
      }
    },
    getSaveProgress: function (profileId, cb) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/scriptwriter",
        load: dojo.hitch(this, dojo.partial(this.saveProgressReceived, cb)),
        preventCache: true,
        error: qubit.globalErrorHandler 
      });
    },
    fetchProfileHistory: function (profileId, callback) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/savehistory",
        handleAs: "json",
        load: dojo.hitch(this, callback),
        preventCache: true,
        error: qubit.globalErrorHandler 
      });
    },
            
    fetchProfileHistoryChanges: function (profileId, callback) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + 
          "/changes",
        handleAs: "json",
        load: dojo.hitch(this, callback),
        preventCache: true,
        error: qubit.globalErrorHandler 
      });
    },
            
    saveProgressReceived: function (cb, progress) {
      if (cb) {
        cb(progress);
      }
    },
    activateProfile: function (profileId, cb) {
      dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {active: true},
        load: dojo.hitch(this, dojo.partial(this.activateProfileLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    activateProfileLoaded: function (cb) {
      if (cb) {
        cb();
      }
    },
    inactivateProfile: function (profileId, cb) {
      dojo.xhrDelete({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + "?f=" + new Date().valueOf(),
        preventCache: true,
        load: dojo.hitch(this, dojo.partial(this.inactivateProfileLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    inactivateProfileLoaded: function (cb) {
      if (cb) {
        cb();
      }
    },
    getFileLocation: function (profileId, callback) {
      this.getJustFilename(profileId, function (msg) {
        var file, parts;
        file = msg;
        parts = Utils.getUrlParts(file);
        callback("//" + parts[1] + (parts[3] || ""));
      });
    },
    getAWSFileLocation: function (profileId, callback) {
      var url = "/QDashboard/qtag/client/" + 
              qubit.data.UserManager.client.id +
              "/profile/" + profileId +
              "/scriptName";
      dojo.xhrGet({
        url: url,
        preventCache: true,
        load: function (msg) {
          if (!msg) {
            throw "getAWSFileLocation: Service returned empty response!";
          }
          //get path only from the url - the prefix
          var file = "opentag.s3.amazonaws.com" + Utils.getUrlParts(msg)[3];
          callback(file);
        }
      });
    },
    getFreeLinkUrl: function (profileId, callback) {
      this.getJustFilename(profileId, function (location) {
        var parts, link;
        parts = location.split("/");
        link = qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + "/getscript/" + 
          parts[parts.length - 1];
        callback(link);
      });
    },
    getJustFilename: function (profileId, callback) {
      var url = "/QDashboard/qtag/client/" + 
              qubit.data.UserManager.client.id +
              "/profile/" + profileId +
              "/scriptName";
      dojo.xhrGet({
        url: url,
        preventCache: true,
        load: function (msg) {
          if (!msg) {
            throw "getAWSFileLocation: Service returned empty response!";
          }
          callback(msg);
        }
      });
    },
    emailDev: function (email, filename) {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/email/developer" + "?f=" + new Date().valueOf(),
        preventCache: true,
        content: {
          email: email,
          text: filename
        },
        error: qubit.globalErrorHandler 
      });
    },
    writeAllProfilesToS3: function () {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id +
          "/profile/scriptwriter" + "?f=" + new Date().valueOf(),
        preventCache: true,
        error: qubit.globalErrorHandler 
      });
    },
    getProfileVariables: function (profileId) {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id +
          "/profile/" + profileId + "/variable",
        preventCache: true,
        handleAs: "json"
      });
    }
  });
  qubit.qtag.data.dao.ProfileDAO = new qubit.qtag.data.dao._ProfileDAO();
  qubit.qtag.data.dao.ProfileDAO.Completed = "2";
  qubit.qtag.data.dao.ProfileDAO.InProgress = "1";
  qubit.qtag.data.dao.ProfileDAO.NotStarted = "0";
  qubit.qtag.data.dao.ProfileDAO.Error = "-1";
  qubit.qtag.data.dao.ProfileDAO.WriteDenied = "-1";
  qubit.qtag.data.dao.ProfileDAO.WriteFailed = "-2";
  qubit.qtag.data.dao.ProfileDAO.WriteLocked = "-3";
});
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/data/model/CustomVar>

/*global qubit */ 
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.dao._CustomVarDAO", null, {
    getCustomVariables: function (profileId, cb) {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + "/customvar" + "?f=" + new Date().valueOf(),
        handleAs: "json",
        preventCache: true,
        error: qubit.globalErrorHandler
      }).then(dojo.hitch(this, dojo.partial(this.getCustomVarLoaded, cb)));
    },
    getCustomVarLoaded: function (cb, customVars) {
      return dojo.map(customVars, this.createCustomVarModel);
    },
    deleteCustomVariable: function (profileId, customVarId) {
      return dojo.xhrDelete({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + "/customvar/" + customVarId +
          "?f=" + new Date().valueOf(),
        preventCache: true,
        handleAs: "json",
        error: qubit.globalErrorHandler
      });
    },
    addCustomVariable: function (profileId, valueName, value, typeId) {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + "/customvar",
        preventCache: true,
        handleAs: "json",
        content: {
          valueName: valueName,
          value: value,
          typeId: typeId
        },
        error: qubit.globalErrorHandler
      }).then(dojo.hitch(this, dojo.partial(this.createCustomVarModel)));
    },
    saveCustomVariable: function (profileId, id, valueName, value, typeId) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.qtag + 
          "/client/" + qubit.data.UserManager.client.id + 
          "/profile/" + profileId + "/customvar/" + id +
          "?f=" + new Date().valueOf(),
        preventCache: true,
        handleAs: "json",
        content: {
          valueName: valueName,
          value: value,
          typeId: typeId
        },
        error: qubit.globalErrorHandler
      });
    },
    createCustomVarModel: function (customVar) {
      return new qubit.qtag.data.model.CustomVar(
        customVar.id, 
        customVar.name,
        customVar.value,
        customVar.typeId
      );
    }
  }); 
  qubit.qtag.data.dao.CustomVarDAO = new qubit.qtag.data.dao._CustomVarDAO();
  qubit.qtag.data.dao.CustomVarDAO.types = [
    {
      id: "1",
      name: "String value"
    },
    {
      id: "2",
      name: "JavaScript"
    },
    {
      id: "3",
      name: "Query Parameter"
    },
    {
      id: "4",
      name: "Cookie Value"
    },
    {
      id: "5",
      name: "DOM Text"
    }
  ];
  qubit.qtag.data.dao.CustomVarDAO.typesById = {};
  dojo.forEach(qubit.qtag.data.dao.CustomVarDAO.types, function (t) {
    qubit.qtag.data.dao.CustomVarDAO.typesById[t.id] = t.name;
  });
});
/*global console*/
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.model.Filter", null, {
    constructor: function (id, name, pattern, patternType, priority, 
        filterType) {
      this.id = id;
      this.name = name;
      this.pattern = pattern;
      this.patternType = patternType;
      this.priority = priority;
      this.filterType = filterType;
      this.enabled = true;
    }
  });
});
/*global console*/
//= require <qubit/data/Urls>
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.model.Profile", null, {
    constructor: function (id, name, dirty, active, invalidationToken, 
        version, cookieDomain, zipped, delayDocWrite, 
        showCommitFinishedPrompt, maxCookieLength,
        scriptsToUpdate, scriptsVersions) {
      this.id = id;
      this.name = name;
      this.dirty = dirty;
      this.active = active;
      this.invalidationToken = invalidationToken;
      this.version = version;
      this.cookieDomain = cookieDomain;
      this.zipped = zipped;
      this.delayDocWrite = delayDocWrite;
      this.showCommitFinishedPrompt = showCommitFinishedPrompt;
      this.maxCookieLength = maxCookieLength;
      this.scriptsToUpdate = scriptsToUpdate;
      this.scriptsVersions = scriptsVersions;
    },
    needsSaving: function () {
      return (this.dirty || this.hasNewVersion());
    },
    hasNewVersion: function () {
      return  (this.scriptsToUpdate &&
                 this.scriptsToUpdate.length > 0);
    },
    markAsSaved: function () {
      this.dirty = false;
      this.scriptsToUpdate = [];
    }
  });
});
/*global console*/
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.model.Vendor", null, {
    constructor: function (id, name, description, imageUrl) {
      this.id = id;
      this.name = name;
      this.description = description;
      this.imageUrl = imageUrl;
    }
  });
});
/*global console*/
//= require <qubit/data/Urls>
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.model.FilterGroup", null, {
    constructor: function (id, name, priority) {
      this.id = id;
      this.name = name;
      this.priority = priority;
    }
  });
});
/*global console*/
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.model.Category", null, {
    constructor: function (id, name) {
      this.id = id;
      this.name = name;
    }
  });
});
/*global console*/
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.model.ScriptTemplate", null, {
    constructor: function (
            id,
            name,
            description,
            imageUrl,
            vendorId,
            url,
            html,
            pre,
            post,
            async,
            usesDocWrite,
            isPrivate,
            locationId,
            positionId,
            locationDetail,
            categoryId,
            scriptParams,
            version,
            script,
            sourcesLocation,
            masterSourcesLocation,
            isOneVersionOnly,
            locked) {
      this.id = id;
      this.name = name;
      this.description = description;
      this.imageUrl = imageUrl;
      this.vendorId = vendorId;
      this.url = url;
      this.html = html;
      this.pre = pre;
      this.post = post;
      this.async = async;
      this.locked = locked;
      this.usesDocWrite = usesDocWrite;
      this.isPrivate = isPrivate;
      this.locationId = locationId;
      this.positionId = positionId;
      this.locationDetail = locationDetail;
      this.categoryId = categoryId;
      this.scriptParams = scriptParams;
      this.version = version;
      this.script = script;
      this.sourcesLocation = sourcesLocation;
      this.masterSourcesLocation = masterSourcesLocation;
      this.isOneVersionOnly = isOneVersionOnly;
    }
  });
});
/*global console*/
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.model.ScriptParam", null, {
    constructor: function (id, token, paramName, description, jsName, 
        valueName, universalVarId, hasDefault) {
      this.id = id;
      this.token = token;
      this.paramName = paramName;
      this.description = description;
      this.jsName = jsName;
      this.valueName = valueName;
      this.universalVarId = universalVarId;
      this.hasDefault = hasDefault;
    }
  });
});
/*global console*/
//= require <qubit/data/Urls>
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.model.Script", null, {
    constructor: function (id, masterId, name, filterGroupId, active, async, 
        usesDocWrite, locationId, positionId, locationDetail, dedupe, 
        needsConsent, parentDependencies, childDependencies, version,
        locked) {
      this.id = id;
      this.masterId = masterId;
      this.name = name;
      this.filterGroupId = filterGroupId;
      this.active = active;
      this.async = async;
      this.locked = locked;
      this.usesDocWrite = usesDocWrite;
      this.locationId = locationId;
      this.positionId = positionId;
      this.locationDetail = locationDetail;
      this.dedupe = dedupe;
      this.needsConsent = needsConsent;
      this.parentDependencies = parentDependencies;
      this.childDependencies = childDependencies;
      this.version = version;
    }
  });
});
/*global console*/
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.model.CustomVar", null, {
    constructor: function (id, name, value, typeId) {
      this.id = id; 
      this.name = name;
      this.value = value;
      this.typeId = typeId;
    }
  });
});
/*global console*/
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.data.model.UniversalVar", null, {
    constructor: function (id, name, description, jsName) {
      this.id = id; 
      this.name = name;
      this.description = description;
      this.jsName = jsName;
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/ConsentDefaults>
//= require <qubit/qtag/data/dao/ConsentDAO>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.NumberTextBox");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.Button");

dojo.require("dijit.layout.TabContainer");
dojo.require("dijit.layout.ContentPane");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.EditConsent",
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      title: "Edit Consent",
      templateString: dojo.cache("qtag.templates", "EditConsent.html"),
      consentConfig: null,
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Edit Consent"
        });
        dojo.addClass(this.popup.domNode, "EditConsentPopup");
        this.inherited(arguments);
      },
      postCreate: function () {
        this.inherited(arguments);
        dojo.connect(this.form, "onSubmit", this, this.submitForm);
        dojo.connect(this.cancelButton, "onClick", this, this.hide);

        dojo.connect(this.resetAllSettings, "onclick", this,
          dojo.hitch(this, this.resetAllConsentSettings));

        dojo.connect(this.basicSettingsTab, "onclick", this,
          dojo.hitch(this, function () {
            this.showTab(0);
          }));
        dojo.connect(this.popupTab, "onclick", this,
          dojo.hitch(this, function () {
            this.showTab(1);
          }));
        dojo.connect(this.statusTab, "onclick", this,
          dojo.hitch(this, function () {
            this.showTab(2);
          }));
        this.showTab(0);
        qubit.qtag.data.dao.ConsentDAO.findOrCreateConsentScript(
          this.profile.id,
          dojo.hitch(this, this.populateTemplateFromConsentConfig)
        );
      },
      populateTemplateFromConsentConfig: function (script, config) {
        // conditionally hide fields
        if (this.mode.getValue() === "notification") {
          dojo.query(".conditional").style({ visibility: "hidden" });
        }
        this.consentScript = script;
        this.consentConfig = config;
        this.fillUpForm();
      },

      fillUpForm: function () {
        // map form fields to config attributes
        // Behaviour Section
        this.mode.setValue(
          this.consentConfig.mode
        );
        this.whenAcceptedHideStatus.setValue(
          this.consentConfig.whenAcceptedHideStatus
        );
        this.onIgnoreShowEvery.setValue(
          this.consentConfig.onIgnoreShowEvery
        );
        this.sampleRate.setValue(
          this.consentConfig.sampleRate === undefined ? 100 : 
            this.consentConfig.sampleRate * 100
        );

        // Content Secion
        this.popup_contentHtml.setValue(
          this.consentConfig.popup.contentHtml
        );
        this.status_contentHtml.setValue(
          this.consentConfig.status.contentHtml
        );
        this.acceptButtonText.setValue(
          this.consentConfig.acceptButtonText
        );
        this.declineButtonText.setValue(
          this.consentConfig.declineButtonText
        );
        this.cookieAndprivacyPolicyText.setValue(
          this.consentConfig.cookieAndprivacyPolicyText
        );
        this.cookieAndprivacyPolicyUrl.setValue(
          this.consentConfig.cookieAndprivacyPolicyUrl
        );

        // Styling Section
        this.popup_iframeCss.setValue(
          this.consentConfig.popup.iframeCss
        );
        this.popup_contentCss.setValue(
          this.consentConfig.popup.contentCss
        );
        this.status_iframeCss.setValue(
          this.consentConfig.status.iframeCss
        );
        this.status_contentCss.setValue(
          this.consentConfig.status.contentCss
        );

        this.statusAcceptedText.setValue(
          this.consentConfig.statusAcceptedText
        );

        this.statusDeclinedText.setValue(
          this.consentConfig.statusDeclinedText
        );
      },

      resetAllConsentSettings: function () {
        var msg = 'Do you wish to reset all the consent widget settings?',
          answer = window.confirm(msg);
        if (answer) {
          this.consentConfig =
            qubit.qtag.ConsentDefaults.defaultConsentScriptConfig();
          this.fillUpForm();
        }
      },

      persistConfig: function () {

        // Behaviour Section
        this.consentConfig.mode =
          this.mode.getValue();

        this.consentConfig.whenAcceptedHideStatus =
          this.whenAcceptedHideStatus.getValue();

        this.consentConfig.onIgnoreShowEvery =
          this.onIgnoreShowEvery.getValue();

        this.consentConfig.sampleRate =
          parseInt(this.sampleRate.getValue(), 10) / 100.0;

        // Content Secion
        this.consentConfig.popup.contentHtml =
          this.popup_contentHtml.getValue();

        this.consentConfig.status.contentHtml =
          this.status_contentHtml.getValue();

        this.consentConfig.acceptButtonText =
          this.acceptButtonText.getValue();

        this.consentConfig.declineButtonText =
          this.declineButtonText.getValue();

        this.consentConfig.cookieAndprivacyPolicyText =
          this.cookieAndprivacyPolicyText.getValue();

        this.consentConfig.cookieAndprivacyPolicyUrl =
          this.cookieAndprivacyPolicyUrl.getValue();

        this.consentConfig.cookieDomain =
          this.profile.cookieDomain;
        
        // Styling Section
        this.consentConfig.popup.iframeCss =
          this.popup_iframeCss.getValue();

        this.consentConfig.popup.contentCss =
          this.popup_contentCss.getValue();

        this.consentConfig.status.iframeCss =
          this.status_iframeCss.getValue();

        this.consentConfig.status.contentCss =
          this.status_contentCss.getValue();

        this.consentConfig.statusAcceptedText =
          this.statusAcceptedText.getValue();

        this.consentConfig.statusDeclinedText =
          this.statusDeclinedText.getValue();

        // provide external access to saved / changed data
        qubit.qtag.EditConsent.consentConfig = this.consentConfig;
      },
      addUploader: function () {
        var uploader = new dojox.form.Uploader({
          label: "Browse file",
          multiple: false,
          uploadOnSelect: true,
          url: "/"
        });
        dojo.byId("fileupload").appendChild(uploader.domNode);
      },

      showTab: function (index) {
        var tabs = ["basicSettingsContainer",
          "popupContainer",
          "statusContainer"],
          tabButtons = ["basicSettingsTab",
            "popupTab",
            "statusTab"];

        dojo.forEach(tabs, dojo.hitch(this, function (e, i) {
          dojo.removeClass(this[tabButtons[i]], "active");
          dojo.style(this[e], { "display": "none" });
          if (tabs[index] === e) {
            dojo.style(this[e], {
              "display": "inline-block"
            });
            dojo.addClass(this[tabButtons[index]], "active");
          }
        }));
      },

      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
        dojo.style(this.popup.domNode, {
          top: "100px"
        });
      },
      hide: function () {
        this.popup.destroy();
        this.onHide();
      },
      onHide: function () {
      },
      submitForm: function (e) {
        dojo.stopEvent(e);
        if (this.form.validate()) {
          this.doneButton.set("disabled", true);
          if (this.validateForm()) {
            this.persistConfig();
            dojo.addClass(this.errorMessage, "hidden");
            this.onSave();
          } else {
            dojo.removeClass(this.errorMessage, "hidden");
            this.doneButton.set("disabled", false);
          }
        }
      },
      onSave: function () {
        qubit.qtag.data.dao.ConsentDAO.saveConsent(this.profile.id,
          this.consentScript, this.consentConfig, dojo.hitch(this, this.hide));
      },
      validateForm: function () {
        var value = parseInt(this.onIgnoreShowEvery.getValue(), 10);
        if ((value && !isNaN(value)) || (value === 0)) {
          return true;
        } else {
          qubit.Util.setText(this.errorMessage,
            "Please only enter numbers in the 'Ask Again' field.");
          return false;
        }
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/WindowManager>
//= require <qubit/qtag/TemplateDetailView>
//= require <qubit/qtag/ParamValueInput>
//= require <qubit/qtag/ScriptLibraryParam>
//= require <qubit/qtag/CreateScriptLibraryParam>
//= require <qubit/qtag/CreateVendor>
//= require <qubit/qtag/data/dao/CategoryDAO>
//= require <qubit/qtag/data/dao/VendorDAO>
//= require <qubit/qtag/data/dao/ScriptTemplateDAO>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.Textarea");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.DateTextBox");

dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dojo.dnd.Source");
dojo.require("dojox.form.BusyButton");
dojo.require("dojox.grid.EnhancedGrid");
dojo.require("dojox.grid.enhanced.plugins.DnD");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.ScriptLibrary", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true, 
      title: "Script Library",
      init: false, 
      useDragDrop: false,
      templateString: dojo.cache("qtag.templates", "ScriptLibrary.html?cb=" + 
          qubit.v),
      filters: [],
      deletedFilters: [],
      postCreate: function () {
        this.inherited(arguments);

        this.params = [];

        dojo.connect(this.form, "onSubmit", this, this.submitForm);
        dojo.connect(this.closeButton, "onClick", this, this.closeTab);
        dojo.connect(this.scriptSource, "onChange", this, 
          this.changeScriptSource);
        dojo.connect(this.location, "onChange", this, this.showLocationDetail);
        dojo.connect(this.templateVendor, "onChange", 
            this, this.vendorSelected);
        dojo.connect(this.editVendor, "onClick", this, this.doEditVendor);

        qubit.Util.setText(this.heading, "Script Library");
        
        qubit.qtag.data.dao.VendorDAO.getVendors(dojo.hitch(this, 
            this.showVendors));
        qubit.qtag.data.dao.CategoryDAO.getCategories(dojo.hitch(this, 
            this.showCategories));
        qubit.qtag.data.dao.UniversalVarDAO.getUniversalVariables()
          .then(dojo.hitch(this, this.saveUniversalVars));
        dojo.connect(this.addParamButton, "onClick", this, this.addNewParam);
        this.changeScriptSource();
      },
      showVendors: function (vendors) {
        this.vendorMap = {};
        this.vendors = vendors;
        vendors = vendors.concat([{
          id: "-1",
          name: "Add new vendor"
        }]);
        while (this.templateVendor.options.length > 0) {
          this.templateVendor.removeOption(0);
        }
        this.templateVendor.addOption(dojo.map(vendors, 
          dojo.hitch(this, function (v) {
            this.vendorMap[v.id] = v;
            return {
              label: v.name,
              value: v.id.toString()
            };
          })));
        if (this.currentVendor) {
          this.templateVendor.setValue(this.currentVendor.id.toString());
        }
      },
      vendorSelected: function () {
        if (this.templateVendor.getValue() === "-1") {
          new qubit.qtag.CreateVendor({
            onSave: dojo.hitch(this, this.vendorCreated)
          }).show();
        }
      },
      vendorCreated: function (v) {
        this.vendorMap[v.id] = v;
        this.templateVendor.addOption([{
          label: v.name,
          value: v.id.toString()
        }]);
        this.templateVendor.set("value", v.id.toString());
      },
      doEditVendor: function () {
        if (this.templateVendor.getValue() !== "-1") {
          new qubit.qtag.CreateVendor({
            vendor: 
              this.vendorMap[parseInt(this.templateVendor.getValue(), 10)],
            onSave: dojo.hitch(this, this.vendorEdited)
          }).show();
        }
      },
      vendorEdited: function (v) {
        this.currentVendor = v;
        qubit.qtag.data.dao.VendorDAO.getVendors(dojo.hitch(this, 
          this.showVendors));
      },
      saveUniversalVars: function (universalVars) {
        this.universalVars = universalVars;
      },
      showCategories: function (categories) {
        this.templateCategory.addOption(dojo.map(categories, function (c) {
          return {
            label: c.name,
            value: c.id.toString()
          };
        }));
      },
      updatePrePostVisibilityForTemplate: function (template) {
        if (template.url &&
            ((template.pre && (template.pre.length > 0)) || 
            (template.post && (template.post.length > 0)))) {
          dojo.addClass(this.prePostHolder, "visible");
        } else {
          dojo.removeClass(this.prePostHolder, "visible");
        }
      },
      createTemplateView: function (template) {
        if (this.templateDetailView) {
          dojo.destroy(this.templateDetailView.domNode);
          this.templateDetailView = null;
        }
        if (template.html) {
          this.templateDetailView = new qubit.qtag.TemplateDetailView({
            template: template
          });
          this.templateDetailView.placeAt(this.templateDetailViewHolder);
        }
      },
      populateTemplatedScriptValues: function () {
        var paramValuesByParamId = {};
        dojo.forEach(this.script.params, function (param) {
          paramValuesByParamId[param.paramId] = param;
        });
        dojo.forEach(this.inputs, function (input) {
          input.setValue(paramValuesByParamId[input.param.id].value);
          input.setId(paramValuesByParamId[input.param.id].id);
        });
      },
      showLocationDetail: function () {
        if (this.location.getValue() === "3") {
          dojo.addClass(this.locationDetailHolder, "visible");
        } else {
          dojo.removeClass(this.locationDetailHolder, "visible");
        }
      },
      showTemplatedScript: function (template) {
        qubit.Util.setText(this.heading, "Edit Script In Library");
        this.showElement(this.customScriptHolder, this.templatedScriptHolder);
        
        //they should be set anyway, weak reference.
        this.htmlText.setValue(template.html);
        this.urlText.setValue(template.url);
        this.scriptText.setValue(template.script); 
        this.preText.setValue(template.pre); 
        this.postText.setValue(template.post);
        
        if (template.html) {
          this.scriptSource.setValue("html");
          this.showHtml();
        } else {
          this.scriptSource.setValue("url");
          this.showUrl();
        }
        
        if (template.id !== undefined) { // temporary (id should not be here)
          this.heading.id = template.id;
        }
        this.templateCategory.setValue(template.categoryId.toString());
        this.templateVendor.setValue(template.vendorId.toString());
        this.location.setValue(template.locationId);
        this.position.setValue(template.positionId);
        this.locationDetail.setValue(template.locationDetail);
        this.scriptNameText.setValue(template.name);
        this.scriptDescriptionText.setValue(template.description);
        this.imageUrl.setValue(template.imageUrl);
        this.async.setValue(template.async);
        this.usesDocWrite.setValue(template.usesDocWrite);
        this.isPrivate.setValue(template.isPrivate);
        this.populateParams(template);
        this.template = template;
      },
      populateParams: function (template) {
        dojo.forEach(this.params, function (param) {
          dojo.destroy(param.domNode);
        });
        this.params = dojo.map(template.scriptParams, 
          dojo.hitch(this, function (param, i) {
            var paramWidget = new qubit.qtag.ScriptLibraryParam({
              param: param,
              colorIndex: (i % 14) + 1,
              universalVars: this.universalVars,
              templateId: template.id
            }).placeAt(this.paramHolder);
            dojo.connect(paramWidget, "onSave", 
              this, dojo.partial(this.paramSaved, paramWidget));
            dojo.connect(paramWidget, "onDelete", 
                this, dojo.partial(this.paramRemoved, paramWidget));
            return paramWidget;
          }));
      },
      paramRemoved: function (paramWidget) {
        dojo.destroy(paramWidget.domNode);
      },
      addNewParam: function () {
        new qubit.qtag.CreateScriptLibraryParam({
          universalVars: this.universalVars,
          templateId: this.template.id,
          onSave: dojo.hitch(this, this.paramAdded)
        }).show();
      },
      paramAdded: function () {
        qubit.qtag.data.dao.ScriptTemplateDAO.getScriptTemplateDetail(
          this.template.id,
          dojo.hitch(this, this.populateParams)
        );
      },
      changeScriptSource: function () {
        if (this.scriptSource.getValue() === "url") {
          this.showUrl();
        } else {
          this.showHtml();
        }
      },
      showUrl: function () {
        this.showElement(this.urlSourceHolder, this.htmlSourceHolder);
        dojo.addClass(this.prePostHolder, "visible");
      },
      showHtml: function () {
        this.showElement(this.htmlSourceHolder, this.urlSourceHolder);
        dojo.removeClass(this.prePostHolder, "visible");
      },
      showElement: function (shownElement, hiddenElement) {
        if (shownElement) {
          dojo.addClass(shownElement, "visible");
          dojo.removeClass(hiddenElement, "visible");
        }
      },
      cancel: function () {
        this.close();
      },
      submitForm: function (e) {
        this.doneButton.set("disabled", true);
        dojo.stopEvent(e);
        if (!this.form.validate()) {
          this.doneButton.set("disabled", false);
        } else {
          if (!this.template) {
            qubit.qtag.data.dao.ScriptTemplateDAO.addScriptTemplates(
              this.scriptNameText.getValue(), 
              this.scriptDescriptionText.getValue(), 
              parseInt(this.templateCategory.getValue(), 10),
              parseInt(this.templateVendor.getValue(), 10),
              dojo.hitch(this, this.checkScriptName)
            ).then(dojo.hitch(this, this.saveDetail));
          } else {
            this.saveDetail();
          }
        }
      },
      saveDetail: function (newScriptTemplate) {
        qubit.qtag.data.dao.ScriptTemplateDAO.saveScriptTemplates(
          (this.heading.id || newScriptTemplate.id),
          this.scriptNameText.getValue(),
          this.scriptDescriptionText.getValue(),
          this.imageUrl.getValue(),
          this.urlText.getValue(),
          this.scriptText.getValue(),
          this.preText.getValue(),
          this.postText.getValue(),
          this.htmlText.getValue(),
          this.async.checked,
          this.usesDocWrite.checked,
          this.isPrivate.checked,
          this.location.getValue(),
          this.position.getValue(),
          this.locationDetail.getValue(),
          parseInt(this.templateCategory.getValue(), 10),
          parseInt(this.templateVendor.getValue(), 10)
        ).then(dojo.hitch(this, this.saveDone));
      },
      doSubmitForm: function () {
        var url, html;
        if (this.scriptSource.getValue() === "url") {
          url = this.urlText.getValue();
          html = "";
        } else {
          url = "";
          html = this.htmlText.getValue();
        }
      },
      saveDone: function () {
        this.doneButton.set("disabled", false);
        this.close();
      },
      closeTab: function () {
        this.close();
      },
      close: function () {
        qubit.qtag.WindowManager.showDashboard();
      },
      onShow: function () {
        this.inherited(arguments);
        this.clearFields();
      },
      clearFields: function () {
        this.location.setValue(1);
        this.position.setValue(1);
        this.preText.setValue("");
        this.postText.setValue("");
        this.urlText.setValue("");
        this.htmlText.setValue("");
        this.locationDetail.setValue("");
        this.scriptNameText.setValue("");
        this.scriptDescriptionText.setValue("");
        this.async.setValue(true);
        this.usesDocWrite.setValue(false);
        this.isPrivate.setValue(false);
      }
    });

  qubit.qtag.CreateScript.DEFAULT_FILTER_NAME = "Default filter: Match all";
});
//= require <qubit/GLOBAL>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.ProgressBar");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.PasswordStrengthIndicator",
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates",
          "PasswordStrengthIndicator.html?cb=" + qubit.v),
      postCreate: function () {
        this.inherited(arguments);
      },
      setValueField: function (valueField) {
        this.valueField = valueField;
        dojo.connect(this.valueField, "onKeyUp", this, this.updateIndicator);
      },
      updateIndicator: function () {
        var strength = this.getPasswordStrength();
        if (strength < 50) {
          dojo.addClass(this.indicator.domNode, "weak");
          dojo.removeClass(this.indicator.domNode, "medium");
          dojo.removeClass(this.indicator.domNode, "strong");
        } else if (strength < 75) {
          dojo.addClass(this.indicator.domNode, "medium");
          dojo.removeClass(this.indicator.domNode, "weak");
          dojo.removeClass(this.indicator.domNode, "strong");
        } else {
          dojo.addClass(this.indicator.domNode, "strong");
          dojo.removeClass(this.indicator.domNode, "weak");
          dojo.removeClass(this.indicator.domNode, "medium");
        }
        this.indicator.update({ maximum: 100, progress: strength });
      },
      getPasswordStrength: function () {
        var password, score, lcase_count, ucase_count, num_count, schar_count;
        password = this.valueField.attr("value");
        score = 0;
        if (password.length < 4) {
          score = score + password.length * 2;
        } else if (password.length < 8) { 
          score = score + 8 + (password.length - 4) * 8;
        } else if (password.length < 13) { 
          score = score + 40 + (password.length - 8) * 2;
        } else {
          score = score + 50;
        }

        lcase_count = password.match(/[a-z]/g);
        lcase_count = lcase_count ? lcase_count.length : 0;
        ucase_count = password.match(/[A-Z]/g);
        ucase_count = ucase_count ? ucase_count.length : 0;
        num_count   = password.match(/[0-9]/g);
        num_count   = num_count ? num_count.length : 0;
        schar_count = 
          password.length - lcase_count - ucase_count - num_count;

        if (lcase_count > 0) {
          score = score + 10;
        }
        if (ucase_count > 0) {
          score = score + 10;
        }
        if (num_count > 0) {
          score = score + 15;
        }
        if (schar_count > 0) {
          score = score + 15;
        }
        if (this.isObviousPassword(password)) {
          score = score - 20;
        }
        return score;
      },
      isObviousPassword: function (password) {
        if (password.toLowerCase().match(/p[a@]ssword/g)) {
          return true;
        }
        return false;
      }    
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/qtag/data/dao/ProfileDAO>
//= require <qubit/qtag/data/dao/StatsDAO>
//= require <qubit/qtag/stats/DedupeViewer>
//= require <qubit/qtag/stats/DateRangeGraph>

dojo.require("dojo.cache");
dojo.require("dojox.math.stats");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.stats.ProfileView", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.stats.templates", 
          "ProfileView.html?cb=" + qubit.v),
      postCreate: function () {
        qubit.Util.setText(this.profileName, this.profile.name);
        dojo.connect(this.nameHolder, "onclick", this, 
          this.toggleProfileDetailView);
        dojo.connect(this, "onShow", this, this.show);
        
        this.viewingSummary = true;
        dojo.connect(this.pageViewButton, "onClick", this, this.showSummary);
        this.tabs = [
          {
            node: this.avgLoadingButton,
            field: "avgLoadingTime"
          },
          {
            node: this.firedButton,
            field: "fired"
          },
          {
            node: this.notFiredButton,
            field: "notFired"
          }
        ];
        dojo.forEach(this.tabs, dojo.hitch(this, function (tab) {
          dojo.connect(tab.node, "onClick", this, 
              dojo.partial(this.showDetail, tab));
        }));
      },
      show: function () {
        dojo.addClass(this.summary, "visible");
        if (!this.statsRequested) {
          this.requestStats();
        }
      },
      showSummary: function () {
        this.toggleProfileDetail(true);
        this.viewingSummary = true;
        
        if (this.lastSelected) {
          dojo.removeClass(this.lastSelected.domNode, "selected_tab");
        }

        dojo.addClass(this.pageViewButton.domNode, "selected_tab");
        this.lastSelected = this.pageViewButton;
        
        dojo.addClass(this.graphHolder, "visible");
        dojo.addClass(this.dedupeHolder, "hidden");
        
        this.showGraphs();
      },
      showDetail: function (tab) {


//        dojo.addClass(this.dedupeHolder, "visible");
//        dojo.removeClass(this.dedupeHolder, "visible");
//        this.lastSelected = this.pageViewButton; 
//        dojo.addClass(this.lastSelected.domNode, "selected_tab");
        
        this.toggleProfileDetail(true);
        this.viewingSummary = false;
        if (this.lastSelected) {
          dojo.removeClass(this.lastSelected.domNode, "selected_tab");
        }
        dojo.addClass(tab.node.domNode, "selected_tab");
        this.lastSelected = tab.node;

        dojo.removeClass(this.graphHolder, "visible");
        dojo.removeClass(this.dedupeHolder, "hidden");
        
        this.drawDedupeCharts(dojo.hitch(this, function () {
          this.updateCharts(tab.field);
        }));
        this.lastField = tab.field;
      },
      updateCharts: function (field) {
        dojo.forEach(this.scriptCharts, function (chart) {
          chart.update(field);
        });
      },
      toggleProfileDetailView: function () {
        dojo.addClass(this.pageViewButton.domNode, "selected_tab");
        this.lastSelected = this.pageViewButton;
        
        this.toggleProfileDetail(!this.showingProfileDetail);
        this.showGraphs();
      },
      toggleProfileDetail: function (showing) {
        this.showingProfileDetail = showing;
        if (!showing) {
          dojo.removeClass(this.domNode, "open");
          dojo.removeClass(this.graphHolder, "visible");
          dojo.removeClass(this.graphHelper, "visible");
          dojo.removeClass(this.dedupeHolder, "visible");
        } else {
          dojo.addClass(this.domNode, "open");
          dojo.addClass(this.graphHolder, "visible");
          dojo.addClass(this.graphHelper, "visible");
          dojo.addClass(this.dedupeHolder, "visible");
        }
      },
      requestStats: function () {
        this.statsRequested = true;
        this.groupBy = this.determineGroupBy(this.startDate, this.endDate);
        qubit.qtag.data.dao.StatsDAO.getProfileStats(this.profile.id,
          this.startDate, this.endDate, this.groupBy, 
          dojo.hitch(this, this.statsLoaded));
      },
      statsLoaded: function (stats) {
        this.lastStats = stats;
        var avgLoadingTime, monthlyPageViews, firedTimes, notFiredTimes;
        monthlyPageViews = parseInt(this.estimateMonthlyAmount(stats, 
          "timesServed"), 10);
        avgLoadingTime = parseInt(this.calculateAverage(stats, 
          "avgLoadingTime"), 10) + " ms";
        firedTimes = parseInt(this.calculateSum(stats, "fired"), 10);
        notFiredTimes = parseInt(this.calculateSum(stats, "notFired"), 10);
        qubit.Util.setText(this.pageViewsHolder, 
          qubit.Util.formatNumber(monthlyPageViews));
        
        this.pageViewButton.set("label", 
            qubit.Util.formatNumber(monthlyPageViews) + " Container Loads");
        this.avgLoadingButton.set("label",
            avgLoadingTime + " Avg Loading Time");
        this.firedButton.set("label",
            qubit.Util.formatNumber(firedTimes) + " Triggered Scripts");
        this.notFiredButton.set("label", 
            qubit.Util.formatNumber(notFiredTimes) + " Untriggered Scripts");
        
        if (this.showingProfileDetail) {
          this.showGraphs();
        }
      },
      showGraphs: function () {
        if (!this.graphsShown && this.viewingSummary) {
          this.pageViewsGraph = this.createGraph(this.pageViewsGraphHolder, 
            "timesServed", this.lastStats);
          this.graphsShown = true;
        } else if (!this.drawnDedupeCharts && !this.viewingSummary) {
          this.drawDedupeCharts(dojo.hitch(this, function () {
            setTimeout(dojo.hitch(this, function () {
              this.updateCharts(this.lastField);
            }), 1);
          }));
        }
      },
      destroyGraphs: function () {
        if (this.graphsShown || this.drawnDedupeCharts) {
          if (this.pageViewsGraph) {
            dojo.destroy(this.pageViewsGraph.domNode);
          }
          if (this.loadingTimeGraph) {
            dojo.destroy(this.loadingTimeGraph.domNode);
          }
          this.graphsShown = false;
          this.drawnDedupeCharts = false;
          dojo.forEach(this.scriptCharts, function (chart) {
            dojo.destroy(chart.domNode);
          });
        }
      },
      calculateAverage: function (stats, value) {
        return this.calculateSum(stats, value) / stats.length;
      },
      calculateSum: function (stats, value) {
        return dojox.math.stats.sum(dojo.map(stats, function (el) {
          return el[value]; 
        }));
      },
      update: function (start, end) {
        this.startDate = start;
        this.endDate = end;
        if (this.statsRequested) {
          this.destroyGraphs();
          this.requestStats();
        }
      },
      drawDedupeCharts: function (cb) {
        if (!this.drawnDedupeCharts) {
          this.drawnDedupeCharts = true;
          qubit.qtag.data.dao.ScriptDAO.getScripts(this.profile.id, 
              dojo.hitch(this, dojo.partial(this.doDrawDedupeCharts, cb)));
        } else {
          cb();
        }
      },
      doDrawDedupeCharts: function (cb, scripts) {
        this.scriptCharts = [];
        this.scripts = scripts;
        this.scriptStats = {};
        this.statsCount = 0;
        dojo.forEach(scripts, dojo.hitch(this, function (script) {
          qubit.qtag.data.dao.StatsDAO.getScriptStats(this.profile.id, 
            script.masterId, this.startDate, this.endDate, this.groupBy, 
            dojo.hitch(this, dojo.partial(this.dedupeDataReceived, 
              cb, scripts.length, script)));
        }));
      },
      dedupeDataReceived: function (cb, total, script, stats) {
        stats.totalFired = 0;
        dojo.forEach(stats, function (stat) {
          stats.totalFired += stat.fired;
        });
        this.scriptStats[script.id] = stats;
        this.statsCount += 1;
        if (this.statsCount === total) {
          this.scripts.sort(dojo.hitch(this, function (a, b) {
            return this.scriptStats[b.id].totalFired - 
              this.scriptStats[a.id].totalFired;
          }));
          dojo.forEach(this.scripts, dojo.hitch(this, function (script) {
            this.scriptCharts.push(
              this.drawDedupeChart(script, this.scriptStats[script.id])
            );
          }));
          cb();
        }
      },
      drawDedupeChart: function (script, stats) {
        var viewer = new qubit.qtag.stats.DedupeViewer({
          script: script,
          stats: stats
        });
        viewer.placeAt(this.dedupeHolder);
        return viewer;
      },
      createGraph: function (holder, value, stats) {
        var width = 812, graph = new qubit.qtag.stats.DateRangeGraph({
          startDate: this.startDate,
          endDate: this.endDate,
          timebucket: this.groupBy,
          value: value,
          requestData: function () {
           
          },
          width: width
        });
        graph.placeAt(holder);
        graph.dataRecieved(stats);
        graph.chart.resize(width, 200);
//        graph.createLegend();
        return graph;
      }
    });
});
//= require <qubit/Util>
//= require <qubit/qtag/data/dao/StatsDAO>
//= require <qubit/graph/TimelineGraph>

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.stats.DateRangeGraph", [qubit.graph.TimelineGraph], {
    widgetsInTemplate: true,
    templateString: 
      "<div " +
      "  dojoAttachPoint='containerNode' " +
      "  style='" +
      "    position:absolute;'" +
      ">" +
      "  <div class='graphNode' dojoAttachPoint='graphNode' ></div>" +
      "  <div class='legendNode' dojoAttachPoint='legendNode' ></div>" +
      "</div>",
    //startDate: null,
    //endDate: null,
    //timebucket: day/week/month/year,
    //value: timesServed, avgLoadingTime, pagesServedOn
    yAxisLabels: {
      timesServed: "Times Served",
      avgLoadingTime: "Avg Loading Time", 
      pagesServedOn: "Pages Served"
    },
    seriesNames: {
      timesServed: "Times Served",
      avgLoadingTime: "Avg Loading Time", 
      pagesServedOn: "Pages Served"
    },
    requestData: function () {
    },
    formatData: function (data) {
      dojo.forEach(data, function (d) {
        d.start = new Date(d.start);
        d.end = new Date(d.end);
      }); 
      return data;
    },
    processData: function (chartData) {
      return dojo.hitch(this, function (dataEl, i) {
        chartData.push({
          dates: [dataEl.start, dataEl.end],
          values: {
            timesServed: dataEl.timesServed,
            avgLoadingTime: dataEl.avgLoadingTime,
            pagesServedOn: dataEl.pagesServedOn,
            fired: dataEl.fired
          }
        });
      });
    },
    getYAxisTitle: function () {
      return this.yAxisLabels[this.value];
    },
    getTimebucket: function () {
      return this.timebucket;
    },
    getPlotValue: function (d) {
      return d.values[this.value];
    },
    getSeriesName: function () {
      return this.seriesNames[this.value];
    }
  });
});
//= require <qubit/Util>
//= require <qubit/qtag/stats/DedupeGraph>

dojo.require("dojo.cache");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.stats.DedupeViewer", 
    [dijit._Widget, dijit._Templated], {
      templateString: dojo.cache("qtag.stats.templates", 
          "DedupeViewer.html?cb=" + qubit.v),
      postCreate: function () {
        qubit.Util.setText(this.name, this.script.name);
      },
      update: function (field) {
        if (this.graph) {
          dojo.destroy(this.graph);
        }
        this.graph = this.createGraph(this.graphHolder, field, this.stats);
        if (field === "avgLoadingTime") {
          qubit.Util.setText(this.summary, 
              "Avg: " + this.getAverage(field).toFixed(1) + " ms");
        } else {
          qubit.Util.setText(this.summary, 
              "Total: " + this.getTotal(field));
        }
      },
      getAverage: function (varName) {
        return this.getTotal(varName) / this.stats.length;
      },
      getTotal: function (varName) {
        var total = 0;
        dojo.forEach(this.stats, function (stat) {
          total += stat[varName];
        });
        return total;
      },
      createGraph: function (holder, value, stats) {
        var width = 620, graph;
        graph = new qubit.qtag.stats.DedupeGraph({
          startDate: this.startDate,
          endDate: this.endDate,
          timebucket: this.groupBy,
          value: value,
          requestData: function () {
           
          },
          width: width
        });
        graph.placeAt(holder);
        graph.dataRecieved(stats);
        graph.chart.resize(width, 144);
//        graph.createLegend();
        return graph;
      }
    });
});
//= require <qubit/Util>
//= require <qubit/qtag/data/dao/StatsDAO>
//= require <qubit/graph/TimelineGraph>

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.stats.DedupeGraph", [qubit.graph.TimelineGraph], {
    widgetsInTemplate: true,
    graphType: "StackedAreas",
    templateString: 
      "<div " +
      "  dojoAttachPoint='containerNode' " +
      "  style='" +
      "    position:absolute;'" +
      ">" +
      "  <div class='graphNode' dojoAttachPoint='graphNode' ></div>" +
      "  <div class='legendNode' dojoAttachPoint='legendNode' ></div>" +
      "</div>",
    yAxisLabels: {
      avgLoadingTime: "Avg Loading Time", 
      fired: "Fired", 
      notFired: "Not Fired"
    },
    seriesNames: {
      avgLoadingTime: "Avg Loading Time", 
      fired: "Fired",
      notFired: "Not Fired"
    },
    requestData: function () {
    },
    formatData: function (data) {
      dojo.forEach(data, function (d) {
        d.start = new Date(d.start);
        d.end = new Date(d.end);
      }); 
      return data;
    },
    processData: function (chartData) {
      return dojo.hitch(this, function (dataEl, i) {
        chartData.push({
          dates: [dataEl.start, dataEl.end],
          values: {
            avgLoadingTime: dataEl.avgLoadingTime,
            fired: dataEl.fired,
            notFired: dataEl.notFired
          }
        });
      });
    },
    getYAxisTitle: function () {
      return this.yAxisLabels[this.value];
    },
    getTimebucket: function () {
      return this.timebucket;
    },
    getPlotValue: function (d, varName) {
      return d.values[varName];
    },
    plot_noDetail: function (chartData) {
      this.plotGraph(chartData, this.value);
    },
    plotGraph: function (chartData, varName) {
      var values = dojo.filter(dojo.map(chartData, 
        dojo.hitch(this, function (d) {
          if (d.values) {
            return this.getPlotValue(d, varName);
          }
        })), 
        function (el) {
          return (el !== null) && (el !== undefined);
        });
      this.chart.addSeries(this.getSeriesName(varName), values);
    },
    getSeriesName: function (varName) {
      return this.seriesNames[varName];
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/qtag/data/dao/StatsDAO>
//= require <qubit/qtag/stats/DateRangeGraph>
//= require <qubit/qtag/stats/ProfileView>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.form.Button");
dojo.registerModulePath("qtag.stats.templates", 
  "/QDashboard/qtag/statstemplates/");
dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.stats.Statistics", 
    [dijit._Widget, dijit._Templated], 
    {
      widgetsInTemplate: true, 
      title: "Statistics",
      init: false,
      templateString: dojo.cache("qtag.stats.templates", "Statistics.html?cb=" +
          qubit.v),
      postCreate: function () {
        this.initDateRange();
        this.showProfileStats();
      },
      initDateRange: function () {
        dojo.connect(this.weekRange, "onClick", this, this.selectWeek);
        dojo.connect(this.monthRange, "onClick", this, this.selectMonth);
        //TODO: Add this back in.
//        dojo.connect(this.customRange, "onClick", this, this.selectCustom);
        this.selectWeek();
      },
      selectWeek: function () {
        var lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        this.selectDateRange(lastWeek, new Date());
      },
      selectMonth: function () {
        var lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        this.selectDateRange(lastMonth, new Date());
      },
      selectCustom: function () {
        
      },
      selectDateRange: function (start, end) {
        this.startDate = start;
        this.endDate = end;
        qubit.Util.setText(this.dateRange,  
          dojo.date.locale.format(start, {selector: "date"}) + 
          "\u00A0\u2013\u00A0" + 
          dojo.date.locale.format(end, {selector: "date"})
          );
        this.updateGraphs(start, end);
      },
      initAllRangeGraph: function () {
        var start, end, group;
        start = this.getStartDate();
        end = this.getEndDate();
        group = this.determineGroupBy(start, end);
        this.dateRangeGraph = new qubit.qtag.stats.DateRangeGraph({
          startDate: start,
          endDate: end,
          timebucket: group,
          value: "timesServed",
          requestData: function () {
            qubit.qtag.data.dao.StatsDAO.getClientStats(start, 
                end, group, dojo.hitch(this, this.doDataReceived));
          },
          doDataReceived: function (data) {
            this.receivedStatsData(data);
            this.dataRecieved(data);
            if (!this.chart.ticks) {
              this.chart.ticks = [];
            }
            this.chart.resize(806, 300);
          },
          receivedStatsData: dojo.hitch(this, this.receivedStatsData)
        });
        this.dateRangeGraph.placeAt(this.allRangeGraphHolder);
        dojo.connect(this.dateRangeGraph, "onPlotComplete", this, 
          this.allRangeGraphRendered);
      },
      receivedStatsData: function (data) {
        qubit.Util.setText(this.monthlyPageViews, 
          qubit.Util.formatNumber(
            parseInt(this.estimateMonthlyAmount(data, "timesServed"), 10)
          ));
      },
      estimateMonthlyAmount: function (data, value) {
        var timesServed = 0;
        dojo.forEach(data, function (el) {
          var duration = ((el.end.getTime() - el.start.getTime()) / 
            (24 * 60 * 60 * 1000)); 
          timesServed += el[value] / duration;
        });
        return (timesServed / data.length) * 30;
      },
      determineGroupBy: function (start, end) {
        var group, moreThanFortnight;
        moreThanFortnight = (end.getTime() - 
          start.getTime()) > (14 * 24 * 60 * 60 * 1000);
        if (moreThanFortnight) {
          group = qubit.qtag.data.dao.StatsDAO.weekly;
        } else {
          group = qubit.qtag.data.dao.StatsDAO.daily;
        }
        return group;
      },
      allRangeGraphRendered: function () {
        if (!this.dateRangeGraph.chart.ticks) {
          this.dateRangeGraph.chart.ticks = [];
        }
        this.dateRangeGraph.chart.resize(806, 300);
      },
      showProfileStats: function () {
        qubit.qtag.data.dao.ProfileDAO.getProfiles(
          dojo.hitch(this, this.profilesLoaded)
        );
      },
      profilesLoaded: function (profiles) {
        profiles.sort(function (a, b) {
          if (a.active === b.active) {
            return (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1;
          } else {
            return a.active ? -1 : 1;
          }
        });
        this.profiles = dojo.map(profiles, 
          dojo.hitch(this, this.createProfileView));
      },
      createProfileView: function (profile) {
        var pv = new qubit.qtag.stats.ProfileView({
          profile: profile,
          startDate: this.getStartDate(),
          endDate: this.getEndDate(),
          determineGroupBy: this.determineGroupBy,
          estimateMonthlyAmount: this.estimateMonthlyAmount
        });
        pv.placeAt(this.containerStatsHolder);
        return pv;
      },
      updateGraphs: function (start, end) {
        if (this.dateRangeGraph) {
          dojo.destroy(this.dateRangeGraph.domNode);
          this.initAllRangeGraph();
          dojo.forEach(this.profiles, function (profileView) {
            profileView.update(start, end);
          });
        }
      },
      startup: function (stats) {
      },
      onShow: function () {
        if (!this.init) {
          this.initAllRangeGraph();
          this.init = true;
        }
//        if (!dojo.isIE) {
//          this.dateRangeGraph.createLegend();
//        }
        dojo.forEach(this.profiles, function (profile) {
          profile.onShow();
        });
      },
      getStartDate: function () {
        return this.startDate;
      },
      getEndDate: function () {
        return this.endDate;
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/PaymentSettingsDialogue>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.TextBox");

dojo.addOnLoad(function () {
  dojo.declare("qubit.qtag.CreditCardNeeded", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", 
          "CreditCardNeeded.html?cb=" + qubit.v),
      postCreate: function () {
        this.inherited(arguments);
        dojo.connect(this.enterCard1, "onclick", this, this.showCreditCardForm);
        dojo.connect(this.enterCard2, "onclick", this, this.showCreditCardForm);
        qubit.Util.setText(this.pageViews, 
            qubit.Util.formatNumber(parseInt(this.usage, 10)));
        if (this.days > 0) {
          qubit.Util.setText(this.thresholdDays, 
              "in " + this.days + (" day" + (this.days > 1 ? "s" : "")));
        } else {
          qubit.Util.setText(this.thresholdDays, "imminently");
        }
        if (this.usage > 1e6) {
          dojo.addClass(this.nearingLimit, "hidden");
        } else {
          dojo.addClass(this.overLimit, "hidden");
        }
      },
      showCreditCardForm: function () {
        this.paymentSettingsPage = new qubit.PaymentSettingsDialogue({
          onPaymentSuccess: dojo.hitch(this, this.paymentSuceeded)
        });
        this.paymentSettingsPage.show();
      },
      paymentSuceeded: function () {
        dojo.destroy(this.domNode);
        if (this.onFinish) {
          this.onFinish();
        }
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/qtag/ScriptChooser>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/PasswordStrengthIndicator>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.TextBox");
dojo.require("dojox.validate");
dojo.require("dojox.validate.web");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dijit.form.Button");

dojo.addOnLoad(function () {
  dojo.declare("qubit.ForgotPass", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qubit.templates", "ForgotPass.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Reset Your Password"
        });
        this.inherited(arguments);
      },
      postCreate: function () {
        _gaq.push(['_trackPageview', '/ForgotPassPopUp']);
        this.inherited(arguments);
        dojo.connect(this.ok, "onClick", this, this.hide);
        dojo.connect(this.form, "onSubmit", this, this.submitForm);
      },
      submitForm: function (e) {
        dojo.stopEvent(e);
        var values = this.form.getValues();
                
        if (!dojox.validate.isEmailAddress(values.email)) {
          this.messageHolder.innerHTML = "<div class='red'>" +
            "The email entered doesn't look like a valid email address." +
            "</div>";
          return;
        }
        
        this.resetButton.set('disabled', true);
        qubit.data.UserManager.resetPassword(values.email, 
            dojo.hitch(this, this.resetPasswordComplete));
      },
      resetPasswordComplete: function (message, response) {
        this.messageHolder.innerHTML = "<div class='green'>" +
          "You will receive an email with instructions about how " +
          "to reset your password in a few minutes." +
          "</div>";
        setTimeout(dojo.hitch(this, this.hide), 2000);
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
      },
      hide: function () {
        this.popup.destroy();
      }
    });
});
//= require <qubit/GLOBAL>
//notnow= require <qubit/qfeedback/QExit>
//= require <qubit/qtag/QTag>
//= require <qubit/qtag/Settings>
//= require <qubit/PaymentSettingsDialogue>
//= require <qubit/PaymentHistory>
//= require <qubit/AddAccountUser>
//= require <qubit/Footer>
//= require <qubit/data/Permissions>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.TabContainer");
dojo.require("dijit.layout.ContentPane");

dojo.addOnLoad(function () {
  dojo.declare("qubit.Applications", [dijit._Widget, dijit._Templated], {

    widgetsInTemplate: true,
    templateString: dojo.cache("qubit.templates", "Applications.html?cb=" + 
        qubit.v),
     
    postCreate: function () {
      qubit.data.Permissions.enableButton(this.profileSettings, this, 
          this.switchToProfileSettings);
      qubit.data.Permissions.setupButton(this.paymentSettings, this,
          this.switchToPaymentSettings, "setHosted");
      qubit.data.Permissions.setupButton(this.billingHistory, this,
          this.switchToBillingHistory, "invoiceBreakdown");
      qubit.data.Permissions.setupButton(this.addUserToAccount, this,
          this.switchToAddUser, "addUserToAccount");
      qubit.data.Permissions.enableButton(this.logoutButton, this, this.logout);
      
      qubit.data.UserManager.getUser(dojo.hitch(this, this.showUserName));
      qubit.data.UserManager.getUserClients()
        .then(dojo.hitch(this, this.showAvailableClients));
      dojo.connect(this.logo, "onclick", this, this.logoHandler);
    },
    showAvailableClients: function (clients) {
      this.clients = clients;
      qubit.OPENTAG_APP = this;
      this.showUserStatus();
    },
    showUserName: function (user) {
      this.user = user;
      this.showUserStatus();
      qubit.Applications.currentUser = user;
      qubit.Applications.isAdminUser = this.isAdmin;
      this.createDashboard();
    },
    isAdmin: function () {
      return (qubit.Applications.currentUser.systemRoleId === 
          qubit.Applications.ADMIN_ROLE_ID);
    },
    showUserStatus: function () {
      if (this.clients && this.user) {
        var c, 
          currentClientId = qubit.data.UserManager.client.id, 
          clientMap = {};
        this.clients.sort(function (a, b) {
          if (b.clientId === currentClientId) {
            return 1;
          } else if (a.clientId === currentClientId) {
            return -1;
          }
          return a.clientId - b.clientId;
        });
        dojo.forEach(this.clients, function (client) {
          clientMap[client.clientId] = client;
        });
        this.clientSelector.addOption(dojo.map(this.clients, 
          dojo.hitch(this, function (client) {
            var option = {
              label: client.clientName.replace(/</g, "&lt;")
                .replace(/>/g, "&gt;") + " as " + client.roleName,
              value: client.clientId
            };
            if (currentClientId === client.clientId) {
              option.selected = true;
            }
            return option;
          })));
        qubit.Util.setText(this.userNameDisplay, 
            "Logged in as " + this.user.username);
        if (this.clients.length > 1) {
          setTimeout(dojo.hitch(this, function () {
            this.clientSelectorConnection = 
              dojo.connect(this.clientSelector, "onChange", 
                this, this.changeClient);
          }), 1);
        } else {
          dojo.addClass(this.clientSelector.domNode, "hidden");
          dojo.addClass(this.clientSelectorHolder, "hidden");
          dojo.addClass(this.userNameHolder, "soLonely");
        }
      }
    },
    changeClient: function () {
      var clientId = this.clientSelector.getValue();
      if (clientId !== qubit.data.UserManager.client.id) {
        qubit.data.UserManager.changeClient(clientId);
      }
    },
    logout: function () {
      qubit.data.UserManager.logout(function () {
        window.location.reload();
      });
    },
    createSplashScreen: function () {
      var splashScreen = new qubit.SplashScreen();
      splashScreen.placeAt(this.containerNode);
      dojo.destroy(this.containerNode);
    },
    createDashboard: function () {
      setTimeout(dojo.hitch(this, function () {
        var qtag = new qubit.qtag.QTag();
        qtag.placeAt(this.containerNode);
        qtag.startup();
      }), 1);
    },
    switchToProfileSettings: function () {
      this.settingsPage = new qubit.qtag.Settings();
      this.settingsPage.show();	
    },
    switchToPaymentSettings: function () {
      this.paymentSettingsPage = new qubit.PaymentSettingsDialogue();
      this.paymentSettingsPage.show();
    },
    switchToBillingHistory: function () {
      this.billingHistoryPage = new qubit.PaymentHistory();
      this.billingHistoryPage.show(); 
    },
    switchToAddUser: function () {
      this.addUserPage = new qubit.AddAccountUser();
      this.addUserPage.show(); 
      dojo.connect(this.addUserPage, "onClientNameChange", 
          this, this.clientNameChanged);
      
    },
    clientNameChanged: function (name) {
      while (this.clientSelector.options.length > 0) {
        this.clientSelector.removeOption(0);
      }
      dojo.disconnect(this.clientSelectorConnection);
      qubit.data.UserManager.getUserClients()
        .then(dojo.hitch(this, this.showAvailableClients));

    },
    
    getApps: function () {
      return [
        {
          title: "QTag",
          App: qubit.qtag.QTag
        },
        {
          title: "QFeedback",
          App: qubit.qfeedback.QExit 
        },
        {
          title: "Upgrade",
          App: "Not implemented2" 
        }
      ];
    },
  
    increment: function () {
      this._i += 1;
      this.containerNode.innerHTML = this._i;
    },
    
    logoHandler: function () {
      dojo.publish("logo/clicked");
    }
  });
  qubit.Applications.ADMIN_ROLE_ID = 2; 
});
//= require <qubit/GLOBAL>
//= require <qubit/qtag/PaymentDecision>
//= require <qubit/qtag/PaymentForm>
//= require <qubit/ChangePaymentSettingsSuccess>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Form");
dojo.require("dijit.InlineEditBox");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Textarea");

//Deliberately reusing PaymentDialogue.html
dojo.addOnLoad(function () {
  dojo.declare("qubit.PaymentSettingsDialogue", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qtag.templates", "PaymentDialogue.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Credit Card Registration"
        });
        this.inherited(arguments);
      },
      doHost: function () {
        var paymentForm = new qubit.qtag.PaymentForm();
        paymentForm.placeAt(this.paymentFormHolder);
        dojo.connect(paymentForm, "onPaymentSuccess", this, 
          this.paymentSucceeded);
      },
      paymentSucceeded: function () {
        var paymentSuccess = this.showPaymentSuccess();
        dojo.connect(paymentSuccess, "onClose", this, 
          this.paymentSuccessClosed);
      },
      showPaymentSuccess: function () {
        dojo.destroy(this.paymentFormHolder);
        var paymentSuccess = new qubit.ChangePaymentSettingsSuccess({});
        paymentSuccess.placeAt(this.paymentSuccessHolder);
        this.popup.set("title", "");
        return paymentSuccess;
      },
      paymentSuccessClosed: function () {
        this.onPaymentSuccess();
        this.hide();
      },
      onPaymentSuccess: function () {
        
      },
      show: function () {
        if (!this.shown) {
          this.popup.attr("content", this.domNode);
          this.popup.show();
          this.doHost();
          //TODO: try to avoid calling _position by moving swapping the two
          //lines above
          this.popup._position();
          this.shown = true;
        }
      },
      hide: function () {
        this.popup.destroy();
      }
    });
});
//= require <qubit/GLOBAL>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.Form");

dojo.addOnLoad(function () {
  dojo.declare("qubit.UserViewer", [ dijit._Widget, dijit._Templated ], {
    widgetsInTemplate : true,
    templateString : dojo.cache("qubit.templates", "UserViewer.html?cb=" + 
        qubit.v),
    postCreate : function () {
      var email = this.user.email;
      if (email.length > 35) {
        email = email.substring(0, 35) + "...";
      }
      qubit.Util.setText(this.email, email);
      this.setStatus();
      this.role.addOption(dojo.map(this.roles, function (role) {
        return {
          label: role.name,
          value: role.id.toString()
        };
      }));
      this.role.setValue(this.opentagRole.id);
      
      if (this.user.verified) {
        dojo.addClass(this.verifyButton.domNode, "hidden");
      } else {
        dojo.connect(this.verifyButton, "onClick", this, this.verifyUser);
      }

//      if (!this.user.locked) {
//        dojo.addClass(this.unlockButton.domNode, "hidden");
//      } else {
//        dojo.connect(this.unlockButton, "onClick", this, this.unlockUser);
//      }
    },
    startup: function () {
      this.inherited(arguments);
      if (this.isCurrent) {
        this.removeButton.set("disabled", true);
        this.role.set("disabled", true);
      } else {
        dojo.connect(this.removeButton, "onClick", this, this.removeUser);
        dojo.connect(this.role, "onChange", this, this.updateRole);
      }
    },
    setStatus: function () {
      var text = "";
      if (!this.user.verified) {
        text += "Not verified ";
      }
      if (!this.user.verified && this.user.locked) {
        text += " - ";
      }
      if (this.user.locked) {
        text += "Locked";
      }
      qubit.Util.setText(this.status, text);
    },
    verifyUser: function () {
      qubit.data.UserManager.verifyUser(this.user.id);
      dojo.style(this.verifyButton, "opacity", "1");
      var d = new dojo.Deferred();
      dojo.fadeOut({
        node: this.verifyButton.domNode
      }).play();
    },
    unlockUser: function () {
      qubit.data.UserManager.unlockUser(this.user.id);
      dojo.style(this.unlockButton, "opacity", "1");
      var d = new dojo.Deferred();
      dojo.fadeOut({
        node: this.unlockButton.domNode
      }).play();
    },
    removeUser: function () {
      qubit.data.UserManager.removeUserFromClient(this.user.id)
        .then(dojo.hitch(this, this.userRemoved));
    },
    userRemoved: function () {
      this.onUserRemoved();
    },
    onUserRemoved: function () {
      
    },
    updateRole: function () {
      if (this.role.getValue() !== this.opentagRole.id) {
        qubit.data.UserManager.updateUserRole(this.user.id, 
            this.role.getValue()).then(dojo.hitch(this, this.roleUpdated));
      }
    },
    roleUpdated: function (ok) {
      this.opentagRole.id = this.role.getValue();
      this.onRoleUpdated();
    },
    onRoleUpdated: function () {
    }
  });
});
dojo.addOnLoad(function () {
  dojo.declare("qubit._Util", null, {
    getText: function (el) {
      if (typeof (el.textContent) === "string") {
        return el.textContent;
      } else {
        return el.innerText;
      }
    },
    setText: function (el, text) {
      if (typeof (el.textContent) === "string") {
        el.textContent = text;
      } else {
        el.innerText = text;
      }
    },
    formatNumber: function (x) {
      var parts = x.toString().split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts.join(".");
    },
    
    getMonthNames: function () {
      if (!this.monthNames) {
        this.monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; 
      }
      return this.monthNames;
    },
    getMonthName: function (i) {
      return this.getMonthNames()[i];
    }
  });
  qubit.Util = new qubit._Util();
});
//= require <qubit/GLOBAL>
//= require <qubit/NotificationManager>
//= require <qubit/Helper>
//= require <qubit/widget/utils/Utils>

(function () {
  var JSHINT = window.JSHINT,
    Utils = qubit.widget.utils.Utils,
    errorKeywords,
    frameInserted = false,
    errorFilterPass,
    theSandBoxFrame,
    tryScriptInASandbox,
    getScriptsFromHTML,
    searchClosingTagBracket,
    notifyErrors,
    SERIOUS_NOTIFY_LONG = 10 * 20 * 1000,
    NOTIFY_OK_LONG = 10 * 1000,
    JSHINT_ERROR_LONG = 10 * 7 * 1000,
    EXPLANATION_NOTIFY_LONG = 10 * 20 * 1000,
    CODE_ERROR_CLASS = 'js-validator-error',
    CODE_OK_CLASS = 'js-validator-ok',
    CODE_TIP_CLASS = 'js-validator-tip',
    CODE_HINT_CLASS = 'js-validator-hint',
    WARNING_MESSAGE = 
      "The validator detects possible problems with your code. " +
      "Well formed code will not cause any errors but for some cases " +
      "warnings will be generated to warn you of possible missing " + 
      "external variables. If you are sure these exist on your website, " + 
      "then you may safely ignore these warnings and save your script.",
    ALL_OKAY_MESSAGE = 
      "<b>Your code is well formed.</b>",
    CODE_ERROR_WARNING_MESSAGE = 
      "(POSSIBLE ISSUE) If it is a 'not defined' error you may ignore" +
      " this message.<br/><br/>",
    JSHINT_CONFIGURATION = {

      "bitwise"       : false,     // Prohibit bitwise operators (&, |, ^, etc.)
      "curly"         : false,     // Require {} for every new block or scope.
      "eqeqeq"        : false,     // Require triple equals i.e. `===`.
      "forin"         : false,     // Tolerate `for in` loops without
      // `hasOwnPrototype`.
      "immed"         : false,     // Require immediate invocations to 
      //be wrapped in parens e.g. `( function(){}() );`
      "latedef"       : false,     // Prohibit variable use before definition.
      "newcap"        : false,     // Require capitalization of all constructor
      // functions e.g. `new F()`.
      "noarg"         : false,     // Prohibit use of `arguments.caller` 
      //and `arguments.callee`.
      "noempty"       : false,     // Prohibit use of empty blocks.
      "nonew"         : false,     // Prohibit use of constructors for 
      //side-effects.
      "plusplus"      : false,     // Prohibit use of `++` & `--`.
      "regexp"        : false,     // Prohibit `.` and `[^...]` in regular
      // expressions.
      "undef"         : true,     // Require all non-global variables be 
      //declared before they are used.
      "strict"        : false,     // Require `use strict` pragma in every file.
      "trailing"      : false,     // Prohibit trailing whitespaces.

      // == Relaxing Options ================================================
      //
      // These options allow you to suppress certain types of warnings. Use
      // them only if you are absolutely positive that you know what you are
      // doing.

      "asi"           : false,    // Tolerate Automatic Semicolon Insertion 
      //(no semicolons).
      "boss"          : false,    // Tolerate assignments inside if, for & 
      //while. Usually conditions & loops are for comparison, not assignments.
      "debug"         : false,    // Allow debugger statements e.g. browser 
      //breakpoints.
      "eqnull"        : false,    // Tolerate use of `== null`.
      "es5"           : false,    // Allow EcmaScript 5 syntax.
      "esnext"        : false,    // Allow ES.next specific features such
      // as `const` and `let`.
      "evil"          : false,    // Tolerate use of `eval`.
      "expr"          : false,    // Tolerate `ExpressionStatement` as Programs.
      "funcscope"     : false,    // Tolerate declarations of variables inside
      // of control structures while accessing them later from the outside.
      "globalstrict"  : false,    // Allow global "use strict" 
      //(also enables 'strict').
      "iterator"      : false,    // Allow usage of __iterator__ property.
      "lastsemic"     : false,    // Tolerat missing semicolons when the it is
      // omitted for the last statement in a one-line block.
      "laxbreak"      : false,    // Tolerate unsafe line breaks e.g. 
      //`return [\n] x` without semicolons.
      "laxcomma"      : false,    // Suppress warnings about comma-first 
      //coding style.
      "loopfunc"      : false,    // Allow functions to be defined within loops.
      "multistr"      : false,    // Tolerate multi-line strings.
      "onecase"       : false,    // Tolerate switches with just one case.
      "proto"         : false,    // Tolerate __proto__ property. 
      //This property is deprecated.
      "regexdash"     : false,    // Tolerate unescaped last dash i.e. `[-...]`.
      "scripturl"     : false,    // Tolerate script-targeted URLs.
      "smarttabs"     : false,    // Tolerate mixed tabs and spaces when 
      //the latter are used for alignmnent only.
      "shadow"        : false,    // Allows re-define variables later 
      //in code e.g. `var x=1; x=2;`.
      "sub"           : false,    // Tolerate all forms of subscript 
      //notation besides dot notation e.g. `dict['key']` instead of `dict.key`.
      "supernew"      : false,    // Tolerate `new function () { ... };`
      // and `new Object;`.
      "validthis"     : false,    // Tolerate strict violations when the code is
      // running in strict mode and you use this in a non-constructor function.

      // == Environments ====================================================
      //
      // These options pre-define global variables that are exposed by
      // popular JavaScript libraries and runtime environments, such as
      // browser or node.js.

      "browser"       : true,     // Standard browser globals e.g. `window`, 
      //`document`.
      "couch"         : false,    // Enable globals exposed by CouchDB.
      "devel"         : true,    // Allow development statements e.g. 
      //`console.log();`.
      "dojo"          : false,    // Enable globals exposed by Dojo Toolkit.
      "jquery"        : false,    // Enable globals exposed by jQuery 
      //JavaScript library.
      "mootools"      : false,    // Enable globals exposed by MooTools 
      //JavaScript framework.
      "node"          : false,    // Enable globals available when code is 
      //running inside of the NodeJS runtime environment.
      "nonstandard"   : false,    // Define non-standard but widely adopted 
      //globals such as escape and unescape.
      "prototypejs"   : false,    // Enable globals exposed by Prototype 
      //JavaScript framework.
      "rhino"         : false,    // Enable globals available when your code 
      //is running inside of the Rhino runtime environment.
      "wsh"           : false,    // Enable globals available when your code 
      //is running as a script for the Windows Script Host.

      // == JSLint Legacy ===================================================
      //
      // These options are legacy from JSLint. Aside from bug fixes they will
      // not be improved in any way and might be removed at any point.

      "nomen"         : false,    // Prohibit use of initial or trailing 
      //underbars in names.
      "onevar"        : false,    // Allow only one `var` statement per function
      "passfail"      : false,    // Stop on first error.
      "white"         : false,    // Check against strict whitespace and 
      //indentation rules.

      // == Undocumented Options ============================================
      //
      // While I've found these options in [example1][2] and [example2][3]
      // they are not described in the [JSHint Options documentation][4].
      //
      // [4]: http://www.jshint.com/options/

      "maxerr"        : 4,      // Maximum errors before stopping.
      "predef"        : [         // Extra globals.
        "$",
        "$$",
        "_"
      ],
      "indent"        : 2         // Specify indentation spacing
    };









  /**
   * JS Validator. Uses JSHint as a base and framed container for testing.
   * 
   * @param {Object} config object:
   * {
   *    notificationManager: {qubit.NotificationManager} to be used for 
   *      notifications (optional) or qubit.JS_NOTIFICATIONS will be used,
   *    notificationContainer: {Node} node reference that will be used to
   *      anchor notification manager (optional)
   * }
   */
  function JSValidator(config) {
    if (config) {
      this.notificationManager = config.notificationManager || 
        qubit.JS_NOTIFICATIONS;
      this.notificationContainer = config.notificationContainer;
      
      //init
      if (this.notificationContainer) {
        this.notificationManager.setParentContainer(this.notificationContainer);
      }
    }
  }
  
    
  /**
   * Validating function using JSHINT.
   * @param src {String} javascript source to be validated
   * @return errors {Array[Object]} JSHINT error objects
   */
  JSValidator.prototype.validateJSHINT = function (src) {
    var errors = [];
    try {
      JSHINT(src, JSHINT_CONFIGURATION);
      errors.push.apply(errors, JSHINT.errors);
    } catch (ex) {
      //catch any unstable behaviour from HINTer. It is not critical.
    }
    return errors;
  };
  
  /**
   * Validating function using generic frame and evalz.
   * @param src {String} javascript source to be validated
   * @return errors {Array[]} standard objects array with exception field
   */
  JSValidator.prototype.validate = function (src) {
    var errors = [], result;
    
    result = tryScriptInASandbox("\n if(0){\n " + src + " \n}\n ");
    
    if (result.exception) {
      errors.push({
        unrecoverable: result.exception
      });
    } else {
      //syntax midd acceptable - try deeper:
      result = tryScriptInASandbox(src);

      if (result.exception && result.exception.name === "SyntaxError") {
        errors.push({
          unrecoverable: result.exception
        });
      } else {
        errors.push({
          runtimeerror: result.exception
        });
      }
    }
    return errors;
  };
  
  /**
   * Function used for validating scripts embeded in html source.
   * It will show generic notifications by default.
   * @param html {String}
   * @param noPopups {Boolean} if true no notification will be shown
   * @return errors array or null if no scripts detected
   */
  JSValidator.prototype.validateHTMLForJavaScript = function (html, noPopups) {
    var scripts = getScriptsFromHTML(html);
    return this.validateScripts(scripts, noPopups);
  };
  
  /**
   * Function used for validating scripts source.
   * It will show generic notifications by default.
   * @param scripts {String[]}
   * @param noPopups {Boolean} if true no notification will be shown
   * @return errors array or null if no scripts detected
   */
  JSValidator.prototype.validateScripts = function (scripts, noPopups) {
    this.clear();
    var i = 0, c = 0, errors = [], currentErrors, at, hasCriticalErrors = false;
    if (!scripts || scripts.length === 0) {
      this.notificationManager.clear();
      if (!noPopups) {
        this.notificationManager.notify("PPP", "<b>No scripts detected.</b>",
          1000, CODE_OK_CLASS, true);
      }
      return null;
    }
    
    for (i = 0; i < scripts.length; i += 1) {
      currentErrors = this.validate(scripts[i]);
      qubit.Helper.removeNullOrUndefined(currentErrors);
      errors.push.apply(errors, currentErrors.splice(0, 5));
      if (currentErrors.length > 5) {
        break;
      }
    }

    for (i = 0; i < scripts.length; i += 1) {
      currentErrors = this.validateJSHINT(scripts[i]);
      qubit.Helper.removeNullOrUndefined(currentErrors);
      for (c = 0; c < currentErrors.length;) {
        if (!errorFilterPass(currentErrors[c].reason)) {
          currentErrors.splice(c, 1);
        } else {
          c += 1;
        }
      }
      errors.push.apply(errors, currentErrors.slice(0, 3));
    }

    //put all criticals as first
    for (i = 0; i < errors.length; i = i + 1) {
      at = errors[i];
      if (at && at.unrecoverable) {
        errors.splice(i, 1);
        errors.splice(0, 0, at);
        i += 1;
        hasCriticalErrors = true;
      }
    }

    errors = errors.slice(0, 3);
    errors.critical = hasCriticalErrors;

    if (!noPopups) {
      notifyErrors(errors, this.notificationManager);
    }
    
    return errors;
  };
  
  /**
   * Gets formatted message depending on errors objects stack passed in.
   * Errors with critical mark will be put at the beggining of returned html.
   * @param errors {Array[]} errors to be used for message construction.
   * @return {String} html message
   */
  JSValidator.prototype.getFormattedMessage = function (errors) {
    var unrecoverable = false, noErrors = true, i, runtimeerror = false,
      strings = [], notifyClassLevel = "green";
    for (i = 0; i < errors.length; i += 1) {
      if (errors[i]) {
        if (errors[i].unrecoverable) {
          strings.push("<span class='" + CODE_ERROR_CLASS + "-msg'>(ERROR" +
            ") <u>" +
            "Your script has an error - please fix this before saving." +
            "</u><br/><br/>" +
            "<span  style=''>" +
            Utils.secureText(errors[i].unrecoverable) +
            "<br/></span>" +
            "</span></span>");
          unrecoverable = true;
          notifyClassLevel = "red";
        } else if (errors[i].runtimeerror) {
          strings.push("<span class='" + CODE_HINT_CLASS + "-msg'><b>" +
            CODE_ERROR_WARNING_MESSAGE +
            "</b><span  style=''>" +
            Utils.secureText(errors[i].runtimeerror) +
            "</span>" +
            "</span>");
          runtimeerror = true;
        } else {
          if (errors[i].id === "(error)") {
            strings.push("<span class='" + CODE_HINT_CLASS +
              "-msg'>(WARNING) Line: " +
              Utils.secureText(
                errors[i].line + " : " + 
                  errors[i].reason + ". Evidence: " + errors[i].evidence
              ) +
              "</span>" +
              "</span>");
            noErrors = false;
          }
        }
      }
    }
    if (!unrecoverable) {
      if (noErrors && !runtimeerror) {
        strings.push("<span class='" + CODE_OK_CLASS + "-msg'>" + 
          ALL_OKAY_MESSAGE +
          "</span>");
      } else {
        notifyClassLevel = "orange";
        strings.push("<br/><span class='" + CODE_TIP_CLASS + "-msg'>" + 
          WARNING_MESSAGE +
          "</span>");
      }
    }
    
    return "<div class='msg " + notifyClassLevel + "'>" +
      strings.join("<br/>") +
      "</div>";
  };
  
  
  /**
   * Destroy function.
   */
  JSValidator.prototype.destroy = function () {
    delete this.scriptGetter;
    delete this.messageContainer;
  };
  
  /**
   * Function to clear messages from the validator instance. 
   * It does call notification manager attached to clear all messages.
   */
  JSValidator.prototype.clear = function () {
    this.notificationManager.clear();
  };
  
  window.qubit.JSValidator = JSValidator;
  
  
  
  //------------- GLOBAL DEFAULT -------------------------
  
  
  //create default JS notification manager
  qubit.Helper.waitForBody(function () {
    qubit.JS_NOTIFICATIONS = new qubit.NotificationManager({
      maxTime: 4 * 1000,
      className: "qubit-js-notification"
    });
    
    qubit.DefaultJSValidatorInstance = new qubit.JSValidator({});
  });


  //----------------- Private utilities -------------------


  /* local reference for tryScriptInASandbox
   */
  theSandBoxFrame = document.createElement("iframe");
  theSandBoxFrame.style.display = "none";
  theSandBoxFrame.setAttribute("sandbox", "allow-scripts allow-same-origin");
  /**
   * Function accepts string as input and creates (cached) iframe sandbox
   * for script testing. It will eval script in the iframe.
   * Each call will clear the frame contents.
   * @param {String} script String containing script to eval
   * @return evaulated code results
   */
  tryScriptInASandbox = function (script) {
    var idoc, testerBody = '<html><body><' + 'script>' +
      'top.open=window.open=' +
      'top.confirm=window.confirm=' +
      'top.alert=window.alert=' +
      'top.prompt=window.prompt=function(){};' +
      'var c=window.console||{};c.log=c.error=c.debug=c.info=c.dir=c.warn=' +
      'c.trace=c.time=c.timeEnd=c.groupEnd=c.group=c.groupCollapsed' +
      '=function(){};' +
      'window.COM_QUBITPRODUCTS_TEST = function (script) { try { ' +
      'return {success:true, result: eval(script)} ' +
      '} catch (e) { ' +
      'return {success: false, exception: e}' +
      '}; } </' + 'script></body></html>';
    
    if (!frameInserted) {
      document.body.appendChild(theSandBoxFrame);
      theSandBoxFrame.src = "about:blank";
      frameInserted = true;
    
      idoc = (theSandBoxFrame.contentWindow &&
        theSandBoxFrame.contentWindow.document) ||
        theSandBoxFrame.contentDocument;
      idoc.write(testerBody);
      idoc.close();
    }
    
    return theSandBoxFrame.contentWindow.COM_QUBITPRODUCTS_TEST(script);
  };

  /**
   * Simple notification trigger for JSValidator.
   * @param errors {Array} of error objects
   * @param notificationManager {qubit.NotificationManager}
   */
  notifyErrors = function (errors, notificationManager) {
    var unrecoverable = false, noErrors = true, i, runtimeerror = false;
    for (i = 0; i < errors.length; i += 1) {
      if (errors[i]) {
        if (errors[i].unrecoverable) {
          notificationManager.notify("script " + i,
            "(ERROR" +
            ") Script has an unrecoverable error! <br/>" +
            "</span><br/>" +
            "<span  style=''>" +
            Utils.secureText(errors[i].unrecoverable) +
            "</span>",
            SERIOUS_NOTIFY_LONG, CODE_ERROR_CLASS, true);
          unrecoverable = true;
        } else if (errors[i].runtimeerror) {
          notificationManager.notify("script " + i,
            "(POSSIBLE ISSUE" +
            ") The script has a possible runtime error! <br/>" +
            " Please check if it needs to be fixed.<br/> <u>If it is" +
            " missing dependency error you can ignore this message.</u><br/>" +
            " The error: </span><br/>" +
            "<span  style=''>" +
            Utils.secureText(errors[i].runtimeerror) +
            "</span>",
            SERIOUS_NOTIFY_LONG, CODE_HINT_CLASS, true);
          runtimeerror = true;
        } else {
          if (errors[i].id === "(error)") {
            notificationManager.notify("script " + i,
              "<span class='micro-notification'>(WARNING) Line: " +
              Utils.secureText(
                errors[i].line + " -> " + 
                  errors[i].reason + " Evidence: " + errors[i].evidence
              ) +
              "</span>",
              JSHINT_ERROR_LONG, CODE_HINT_CLASS, true);
            noErrors = false;
          }
        }
      }
    }
    if (!unrecoverable) {
      if (noErrors && !runtimeerror) {
        notificationManager.notify("PPP", ALL_OKAY_MESSAGE,
          NOTIFY_OK_LONG, CODE_OK_CLASS, true);
      } else {
        notificationManager.notify("PPP", WARNING_MESSAGE,
          EXPLANATION_NOTIFY_LONG, CODE_TIP_CLASS, true);
      }
    }
  };
  
  //define here any string matches to exclude from warnings
  errorKeywords = [
    "indent",
    "Mixed spaces and tabs"
  ];
  
  errorFilterPass = function (string) {
    var i = 0;
    if (string) {
      for (; i < errorKeywords.length; i += 1) {
        if (string.indexOf(errorKeywords[i]) !== -1) {
          return false;
        }
      }
    }
    return true;
  };

  /**
   * Simple text processor.
   * Searching <+script and ending > with enclosing </+script>.
   * It conforms normal rules of DOM parser.
   */
  getScriptsFromHTML = function (html) {
    var len = ("<" + "script").length,
      offset = -1,
      endset = -1,
      scripts = [];
    do {
      // get next <+script after last endset (if endset is -1 loop will break).
      offset = html.indexOf("<" + "script", endset + 1);
      //if found any offset
      if (offset >= 0) {
        //search enclosing bracket
        offset = searchClosingTagBracket(html, offset + len - 1);
        //from offset get closing tag.
        //searchClosingTagBracket gets srtlen if not found, it will 
        //end if not found
        endset = html.indexOf("<\/script>", offset);
        //if endset found after offset
        if (endset >= offset) {
          //script is there
          scripts.push(html.substring(offset, endset));
        }
      }
    //till offset is found and endset too
    } while (offset >= 0 && endset >= 0);
    return scripts;
  };

  /**
   * Simple enclosing > finder.
   * It checks odds of "" and '' in the following tags 
   * (attributes can contains >)
   */
  searchClosingTagBracket = function (string, from) {
    var j = 0, c,
      i = from || 0,
      excludesCounters = {
        "'": 0, 
        '"': 0
      };

    for (; i < string.length; i += 1) {
      c = string.charAt(i);
      if (c === "'") {
        excludesCounters["'"] += 1;
      } else if (c === '"') {
        excludesCounters['"'] += 1;
      } else if (c === ">") {
        if ((excludesCounters["'"] % 2 === 0) &&
            (excludesCounters['"'] % 2 === 0)) {
          return i + 1;//array to offsets difference (0 == 1)
        }
      }
    }
    return string.length;
  };
  
}());
//= require <qubit/GLOBAL>
//= require <qubit/PaymentInvoice>
//= require <qubit/UserViewer>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.form.ComboButton");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.Form");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.data.ClientFilter");
dojo.require("dojox.data.JsonRestStore");

dojo.addOnLoad(function () {
  dojo.declare("qubit.AddAccountUser", [ dijit._Widget, dijit._Templated ], {
    widgetsInTemplate : true,
    title : "Add User",
    templateString : dojo.cache("qubit.templates", "AddAccountUser.html?cb=" + 
        qubit.v),
    postCreate : function () {
      this.inherited(arguments); 
      qubit.data.UserManager.getRoles().then(dojo.hitch(this, function (roles) {
        this.roles = roles;
        this.newUserRole.addOption(dojo.map(this.roles, function (role) {
          return {
            label: role.name,
            value: role.id.toString()
          };
        }));
        qubit.data.UserManager.getClientDetails(
          dojo.hitch(this, this.showClient)
        );
        qubit.data.UserManager.getUser(dojo.hitch(this, this.storeCurrentUser));
      }));
      
      this.accountName.validator = dojo.hitch(this, this.validateAccountName);
      this.accountName.invalidMessage = 
        "Invalid letters used - use only Aa-Zz, 0-9, .,)(@ and spaces.";
      
      dojo.connect(this.accountName, "onChange", 
          this, this.validateAccountName);
      dojo.connect(this.accountName, "onKeyUp", 
          this, this.validateAccountName);
      
      dojo.connect(this.addUserButton, "onClick", this, this.submitAddUser);
      dojo.connect(this.changeClientName, "onClick", 
          this, this.doChangeClientName);
      dojo.connect(this.updateClientName, "onClick", 
          this, this.doUpdateClientName);
      dojo.connect(this.cancelClientName, "onClick", 
          this, this.doCancelClientName);
    },
    isStandardASCIString: function (e) {
      var i, test = this.accountName.getValue();
      for (i = 0; i < test.length; i += 1) {
        //less than space - more than ~ ain't printable
        if ((test.charCodeAt(i) < 32) || (test.charCodeAt(i) > 126)) {
          return false;
        }
      }
      return true;
    },
    validateAccountName: function () {
      if (!this.isStandardASCIString()) {
        this.updateClientName.set("disabled", true);
        return false;
      } else {
        this.updateClientName.set("disabled", false);
        return true;
      }
    },
    storeCurrentUser: function (user) {
      this.currentUser = user;
      this.getUsers();
    },
    showClient: function (client) {
      qubit.Util.setText(this.accountNameHolder, client.name);
      this.accountName.setValue(client.name);
    },
    doChangeClientName: function () {
      dojo.removeClass(this.updateClientName.domNode, "hidden"); 
      dojo.removeClass(this.cancelClientName.domNode, "hidden"); 
      dojo.removeClass(this.accountName.domNode, "hidden"); 
      dojo.addClass(this.accountNameHolder, "hidden"); 
      dojo.addClass(this.changeClientName.domNode, "hidden"); 
    },
    doUpdateClientName: function (e) {
      dojo.stopEvent(e);
      qubit.data.UserManager.updateClient(this.accountName.getValue())
        .then(dojo.hitch(this, this.clientNameUpdated));
      this.doCancelClientName();
      return false;
    },
    doCancelClientName: function () {
      dojo.addClass(this.updateClientName.domNode, "hidden"); 
      dojo.addClass(this.cancelClientName.domNode, "hidden"); 
      dojo.addClass(this.accountName.domNode, "hidden"); 
      dojo.removeClass(this.accountNameHolder, "hidden"); 
      dojo.removeClass(this.changeClientName.domNode, "hidden");
    },
    clientNameUpdated: function (ok) {
      if (ok) {
        var name = this.accountName.getValue();
        this.onClientNameChange(name);
        qubit.Util.setText(this.accountNameHolder, name);
      }
    },
    onClientNameChange: function (name) {
      
    },
    getUsers: function () {
      this.clearUsers();
      var d = new dojo.DeferredList([
        qubit.data.UserManager.getProducts(),
        qubit.data.UserManager.getRoles(),
        qubit.data.UserManager.getUsers()
      ]);
      d.then(dojo.hitch(this, this.showUsers));
    },
    clearUsers: function () {
      dojo.forEach(this.users, function (user) {
        dojo.destroy(user.domNode);
      });
    },
    showUsers: function (deferreds) {
      var products, roles, users, opentagProduct, roleMap = {};
      products = deferreds[0][1];
      roles = deferreds[1][1];
      users = deferreds[2][1];
      dojo.forEach(products, function (product) {
        if (product.name === "Opentag") {
          opentagProduct = product;
        }
      });
      dojo.forEach(roles, function (role) {
        roleMap[role.id] = role; 
      });
      if (opentagProduct) {
        this.users = dojo.map(users, dojo.hitch(this, function (user) {
          var viewer = new qubit.UserViewer({
            user: user,
            opentagRole: roleMap[user.productRoles[opentagProduct.id]],
            roles: this.roles,
            isCurrent: user.id === this.currentUser.id
          });
          viewer.placeAt(this.userViewerHolder);
          dojo.connect(viewer, "onUserRemoved", this, 
              this.removeViewer(viewer));
          dojo.connect(viewer, "onRoleUpdated", this, this.roleUpdated);
          setTimeout(function () {
            viewer.startup();
          }, 1);
          return viewer;
        }));
      }
      dojo.style(this.container.domNode, "height", "");
    },
    roleUpdated: function () {
      qubit.Util.setText(this.statusHolder, "User updated");
      dojo.addClass(this.statusHolder, "ok");
      dojo.removeClass(this.statusHolder, "invisible");
      this.hideStatus();
    },
    removeViewer: function (viewer) {
      return function () {
        dojo.style(viewer.domNode, "opacity", "1");
        var d = new dojo.Deferred();
        dojo.fadeOut({
          node: viewer.domNode,
          onEnd: function () { 
            d.resolve();
          }
        }).play();
        d.then(dojo.hitch(this, function () {
          dojo.style(this.container.domNode, "height", 
            dojo.position(this.container.domNode).h + "px");
          this.getUsers();
        }));
      };
    },
    hideStatus: function () {
      setTimeout(dojo.hitch(this, function () {
        dojo.style(this.statusHolder, "opacity", "1");
        var d = new dojo.Deferred();
        dojo.fadeOut({
          node: this.statusHolder,
          onEnd: function () { 
            d.resolve();
          }
        }).play();
        d.then(dojo.hitch(this, function () {
          dojo.addClass(this.statusHolder, "invisible");
        }));
      }), 3000);
    },
    submitAddUser: function (e) {
      this.addUserButton.set("disabled", true);
      if (this.addUserForm.validate()) {
        var values = this.addUserForm.getValues();
        qubit.data.UserManager.addAccountUser(values.newUserEmail, "",
            "", values.newUserRole)
          .then(dojo.hitch(this, this.registrationComplete));
      } else {
        this.addUserButton.set("disabled", false);
      }
      dojo.stopEvent(e);
    },
    generatePassword: function () {
      var s, i, r = function _() {
        return ((1 + Math.random()) * 65536).toString(36).substring(1, 2);
      };
      s = "";
      for (i = 0; i < 10; i += 1) {
        s += r();
      }
      return s;
    },
    registrationComplete: function (res) {
      dojo.removeClass(this.statusHolder, "invisible");
      if (!res.ok) {
        this.addUserButton.set("disabled", false);
        qubit.Util.setText(this.statusHolder, res.reason);
        dojo.addClass(this.statusHolder, "error");
      } else {
        this.clearFields();
        this.addUserButton.set("disabled", false);
        qubit.Util.setText(this.statusHolder, "User added");
        dojo.addClass(this.statusHolder, "ok");
        this.getUsers();
      }
      this.hideStatus();
    },
    clearFields: function () {
      this.newUserEmail.attr("value", "");
    },
    show : function () {
      this.visible = true;
      this.container.show();
    },
    hide : function () {
      this.visible = false;
      this.container.hide();
    }
  });
});
//= require <qubit/GLOBAL>

dojo.require("dijit.Dialog");

dojo.addOnLoad(function () {
  dojo.declare("qubit.dojox.Dialog", 
    [dijit.Dialog], {
      layout: function () {},
      _position: function () {
        // summary:
        //  Position modal dialog in the viewport. If no relative offset
        //  in the viewport has been determined (by dragging, for instance),
        //  center the node. Otherwise, use the Dialog's stored relative offset,
        //  and position the node to top: left: values based on the viewport.
        // don't do anything if called during auto-scroll
        if (!dojo.hasClass(dojo.body(), "dojoMove")) {  
          var node = this.domNode,
            viewport = dojo.window.getBox(),
            p = this._relativePosition,
            bb = p ? null : dojo.position(node),
            l = Math.floor(viewport.l + (p ? p.x : (viewport.w - bb.w) / 2)),
            t = Math.floor(viewport.t + (p ? p.y : (viewport.h - bb.h) / 2));
          // make sure the dialog never has negative top position
          t = Math.max(t, 14);
          dojo.style(node, {
            left: l + "px",
            top: t + "px"
          });
        }
      }
    });
});
var _gaq = _gaq || [];
var debug = true;

window.qubit = window.qubit || {};
qubit.v = 2;
//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/qtag/ScriptChooser>
//= require <qubit/data/UserManager>
//= require <qubit/qtag/PasswordStrengthIndicator>
//= require <qubit/dojox/Dialog>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  dojo.declare("qubit.Privacy", 
    [dijit._Widget, dijit._Templated], {
      widgetsInTemplate: true,
      templateString: dojo.cache("qubit.templates", "Privacy.html?cb=" + 
          qubit.v),
      postMixInProperties: function () {
        this.popup = new qubit.dojox.Dialog({
          title: "Privacy Policy"
        });
        this.inherited(arguments);
      },
      show: function () {
        this.popup.attr("content", this.domNode);
        this.popup.show();
      },
      hide: function () {
        this.popup.destroy();
      }
    });
});
//= require <qubit/GLOBAL>
//= require <qubit/graph/Chart>
//= require <qubit/graph/TimelineGraph>
//= require <qubit/graph/ColumnGraph>
//= require <qubit/graph/Heatmap>

/*global graph*/
dojo.addOnLoad(function () {
  dojo.declare("qubit.graph.Graph", null, {
  });
  qubit.graph.Graph.createGraph = function (chartData, parent) {
    return qubit.graph.Graph._createGraph(chartData, parent, false);
  };
  qubit.graph.Graph.createDetailedGraph = function (chartData, parent) {
    return qubit.graph.Graph._createGraph(chartData, parent, true);
  };
  qubit.graph.Graph._createGraph = function (chartData, parent, showDetail) {
    var graph, data = {
      chartData: chartData,
      showDetail: showDetail
    };
    if (chartData.groupby) {
      if (chartData.groupby.length === 1) {
        graph = new qubit.graph.ColumnGraph(data);
      } else if (chartData.groupby.length === 2) {
        graph = new qubit.graph.Heatmap(data);
      }
    } else {
      graph = new qubit.graph.TimelineGraph(data);
    } 
    if (parent) {
      graph.placeAt(parent);
    }
    return graph;
  };
});
//= require <qubit/GLOBAL>
//= require <qubit/graph/Chart>
//= require <qubit/graph/QubitTheme>

dojo.require("dojox.charting.Chart2D");
dojo.require("dojox.charting.widget.Legend");
dojo.require("dojox.charting.action2d.Magnify");
dojo.require("dojox.charting.action2d.Tooltip");
dojo.require("dojox.charting.themes.Wetland");

/*global graph*/
dojo.addOnLoad(function () {
  dojo.declare("qubit.graph._Graph", [qubit.graph.Chart], {
    showDetail: false,
    chartData: null,
    constructor: function (args) {
      this.templateString = 
        "<div " +
        "  dojoAttachPoint='containerNode' " +
        "  style='" +
        "    position:absolute;'" +
        ">" +
        "  <div class='graphNode' dojoAttachPoint='graphNode' ></div>" +
        "  <div class='legendNode' dojoAttachPoint='legendNode' ></div>" +
        "</div>";
    },
    createChart: function () {
      this.chart = new dojox.charting.Chart2D(this.graphNode);
      this.chart.setTheme(qubit.graph.QubitTheme);
      this.chart.addPlot("default", {
        type: this.graphType,
        gap: 5,
        tension: 0,
        markers: true,
        lines: true,
        title: "Monthly feedback totals"
      });
      
      this.chart.theme.axis.majorTick.color = "grey";
      this.chart.addPlot("Grid", {
        type: "Grid",
        hAxis: "x",
        vAxis: "y",
        hMajorLines: true,
        hMinorLines: false,
        vMajorLines: false,
        vMinorLines: false
      });
      this.chart.addAxis("y", {
        vertical: true,
        fixLower: "major",
        fixUpper: "major",
        titleGap: 0,
        min: 0/*,
        title: this.getYAxisTitle()*/
      });
      
      this.addChartExtensions();
      return this.chart;
    },
    getYAxisTitle: function () {
      return "Feedbacks given";
    },
    addChartExtensions: function () {
      var magnify;
      magnify = new dojox.charting.action2d.Magnify(this.chart, "default");
      this.createTooltip();
      this.chart.connectToPlot(
        // the unique plot name you specified when creating a plot
        "default",
        function (e) {
  //          console.debug(e);
      });
    },
    createTooltip: function () {
      var tip = new dojox.charting.action2d.Tooltip(this.chart, 
        "default", {});
    },
    plot: function () {
      var chartData = this.getData();
      this.chart.addAxis("x", this._createXAxisData(chartData));
      if (this.showDetail) {
        this.plot_detail(chartData);
      } else {
        this.plot_noDetail(chartData);
      }
//      this.chart.render();
      //this.createLegend();
      this.onPlotComplete();
    },
    onPlotComplete: function () {
      
    },
    createLegend: function () {
      var legend = new dojox.charting.widget.Legend({chart: this.chart});
      legend.placeAt(this.legendNode);
    },
    _createXAxisData: function (chartData) {
      var xAxisData = {
        fixLower: "major",
        fixUpper: "major",
        titleOrientation: "away", 
        majorTickStep: 1,
        natural: true
      };
      this.createXAxisData(chartData, xAxisData);
      return xAxisData;
    }
  });
});
//= require <qubit/graph/_Graph>
//= require <qubit/Util>
dojo.addOnLoad(function () {
  dojo.declare("qubit.graph.TimelineGraph", [qubit.graph._Graph], {
    graphType: "Areas",
    createXAxisData: function (chartData, xAxisData) {
      xAxisData.max = chartData.length - 2;
//      xAxisData.title = this.getTimebucketName();
      xAxisData.labels = dojo.map(chartData, dojo.hitch(this, function (d, i) {
        return {
          value: i, 
          text: this.getLabelName(d.dates[0], i, chartData.length)
        };
      }));
    },
    getLabelName: function (date, i, amount) {
      if ((i % 2 === 1) && (this.width / amount) < 60) {
        return "";
      } 
      
      if (this.getTimebucket() === "month") {
        return qubit.Util.getMonthName(date.getMonth());
      } else {
        return dojo.date.locale.format(date, {
          selector: "date", 
          datePattern: "dd/MM"
        });
      }
    },
    getTimebucket: function () {
      return this.chartData.timebucket;
    },
    getTimebucketName: function () {
      var timebucket = this.getTimebucket();
      if (timebucket === "month") {
        return "Month";
      }
      if (timebucket === "week") {
        return "Week starting on";
      }
      if (timebucket === "day") {
        return "Day";
      }
    },
    plot_detail: function (chartData) {
      var sentimentTypes = 
        qubit.qfeedback.data.DataManager.getAllSentimentTypes();
      dojo.forEach(
        dojox.lang.functional.keys(sentimentTypes), 
        dojo.hitch(this, function (sentimentKey, i) {
          var values = dojo.filter(dojo.map(chartData, 
            function (d) {
              if (d.values) {
                return d.values[
                  qubit.qfeedback.data.DataManager.ungrouped
                ][
                  sentimentKey
                ];
              }
            }), 
            function (el) {
              return (el !== null) && (el !== undefined);
            });
          this.chart.addSeries(sentimentTypes[sentimentKey].name, values);
        })
      );
    },
    plot_noDetail: function (chartData) {
      var values = dojo.filter(dojo.map(chartData, 
        dojo.hitch(this, function (d) {
          if (d.values) {
            return this.getPlotValue(d);
          }
        })), 
        function (el) {
          return (el !== null) && (el !== undefined);
        });
      this.chart.addSeries(this.getSeriesName(), values);
    },
    getSeriesName: function () {
      return "Feedback";
    },
    getPlotValue: function (d) {
      return d.values[qubit.qfeedback.data.DataManager.ungrouped][
        qubit.qfeedback.data.FeedbackSentiment.all
      ];
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/qfeedback/data/DataManager>
//= require <qubit/graph/SingleFeedbackViewer>

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  dojo.declare("qubit.graph.FeedbackViewer", 
    [dijit._Widget, dijit._Templated], 
    {
      templateString: 
        "<div " +
        "    dojoAttachPoint='containerNode' " +
        "    class='qubit_graph_FeedbackViewer'" +
        "</div>",
      postCreate: function () {
        setTimeout(dojo.hitch(this, function () {
          this.getMoreFeedback();
        }), 1000);
        //TODO PF: investigate $
        $(this.containerNode).scroll(dojo.hitch(this, function () {
          if (this.containerNode.scrollTop + this.containerNode.clientHeight ===
              this.containerNode.scrollHeight) {
            this.getMoreFeedback();
          }
        }));
      },
      loadCount: 1,
      getMoreFeedback: function () {
        qubit.qfeedback.data.DataManager.getFeedback(dojo.hitch(this, 
          this.feedbackReceived), this.loadCount);
        this.loadCount += 1;
      },
      number: 0,
      feedbackReceived: function (feedbacks) {
        this.feedbacks = dojo.map(feedbacks, 
          dojo.hitch(this, function (feedback) {
            feedback.number = this.number;
            this.number += 1;
            var fb = new qubit.graph.SingleFeedbackViewer(feedback,
                dojo.create('DIV'));
            fb.placeAt(this.containerNode);
            fb.startup();
            return fb;
          }));
        this.containerNode.style.maxHeight = 
          (qubit.graph.SingleFeedbackViewer.height * 4) + "px";
      }
      
    });
});
dojo.require("dojox.gfx.gradutils");
dojo.require("dojox.charting.Theme");

(function () {
  var dc = dojox.charting, 
    themes = dc.themes, 
    Theme = dc.Theme, 
    g = Theme.generateGradient,
    defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 75};
  dojo.addOnLoad(function () {
    qubit.graph.QubitTheme = new dc.Theme({
      chart: {
        fill:      "#ffffff",
        stroke:    {color: "#ffffff"},
        pageStyle: {
          backgroundColor: "#ffffff", 
          backgroundImage: "none", 
          color: "#ffffff"
        }
      },
      plotarea: {
        fill: "#ffffff"
      },
      axis: {
        stroke: { // the axis itself
          color: "#5ABAC0",
          width: 1
        },
        tick: { // used as a foundation for all ticks
          color: "#5ABAC0",
          position: "center",
          font: "normal normal normal 7pt verdana, Arial, sans-serif", 
          fontColor: "#5ABAC0"
        },
        majorTick: { // major ticks on axis, and used for major gridlines
          width: 0.25,
          length: 0
        },
        minorTick: { // minor ticks on axis, and used for major gridlines
          width:  1,
          length: 0
        }
      },
      series: {
        stroke:  {width: 2, color: "#5ABAC0"},
        outline: null,
        font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
        fontColor: "#5ABAC0",
        fill: "#5ABAC0"
      },
      marker: {
        stroke:  {width: 3, color: "#5ABAC0"},
        outline: null,
        font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
        fontColor: "#5ABAC0"
      },
      seriesThemes: [
        {fill: g(defaultFill, "", "rgba(154,219,223,0.5)")},
        {fill: g(defaultFill, "", "rgba(154,219,223,0.5)")}
      ],
      markerThemes: [
        {fill: "", stroke: {color: "#5ABAC0"}},
        {fill: "", stroke: {color: "#5ABAC0"}}
      ]
    });
    /*
    qubit.graph.QubitTheme.next = function (elementType, mixin, doPost) {
      var isLine, s, theme;
      isLine = elementType === "line";
      if (isLine || (elementType === "area")) {
        // custom processing for lines: substitute colors
        s = this.seriesThemes[this._current % this.seriesThemes.length];
        s.fill.space = "plot";
        if (isLine) {
          s.stroke  = { width: 2.5, color: s.fill.colors[1].color};
        }
        if (elementType === "area") {
          s.fill.y2 = 90;
        }
        theme = Theme.prototype.next.apply(this, arguments);
        // cleanup
        delete s.stroke;
        s.fill.y2 = 75;
        s.fill.space = "shape";
        return theme;
      }
      return Theme.prototype.next.apply(this, arguments);
    };
    
    qubit.graph.QubitTheme.post = function (theme, elementType) {
      theme = Theme.prototype.post.apply(this, arguments);
      if (((elementType === "slice") || (elementType === "circle")) && 
          theme.series.fill && (theme.series.fill.type === "radial")) {
        theme.series.fill = dojox.gfx.gradutils.reverse(theme.series.fill);
      }
      return theme;
    };*/
  });
}());
//= require <qubit/graph/_Graph>
dojo.addOnLoad(function () {
  dojo.declare("qubit.graph.ColumnGraph", [qubit.graph._Graph], {
//        return "ClusteredColumns";
    graphType: "StackedColumns",
    createTooltip: function () {
      var tooltipArgs, tip;
      tooltipArgs = {};
      if (this.graphType === 'StackedColumns') {
        tooltipArgs.text = function (e) {
          return e.run.data[e.index];
        };
      }
      tip = new dojox.charting.action2d.Tooltip(this.chart, 
        "default", tooltipArgs);
    },
    createXAxisData: function (chartData, xAxisData) {
      var groups, groupKeys, labels;
      groups = qubit.qfeedback.data.DataManager.getDataForCategory(
        this.chartData.groupby[0]
      );
      xAxisData.includeZero = false;
      groupKeys = dojox.lang.functional.keys(groups);
      xAxisData.max = groupKeys.length + 1;
      xAxisData.min = 0;
      xAxisData.title = this.chartData.groupby[0];
      labels = dojo.map(
        groupKeys, 
        function (groupKey, i) {
          return {
            value: i + 1, 
            text: groups[groupKey].name
          };
        }
      );
      labels = [{value: 0, text: ""}]
        .concat(labels)
        .concat([{value: groupKeys.length + 1, text: ""}]);
      xAxisData.labels = labels;
    },
    plot_noDetail: function (chartData) {
      var getSentimentInGroup, processSentimentInGroup, sentimentTypes, groups;
      sentimentTypes = qubit.qfeedback.data.DataManager.getSentimentTypes();
      groups = qubit.qfeedback.data.DataManager.getDataForCategory(
        this.chartData.groupby[0]
      );
      getSentimentInGroup = function (sentimentKey, groupId, i) {
        var values = dojo.filter(dojo.map(chartData, 
          function (chartDataEl) {
            if (chartDataEl.values) {
              var value = chartDataEl.values[groupId][sentimentKey];
              return value;
            }
          }),
          function (el) {
            return (el !== null) && (el !== undefined);
          });
        return values[0];
      };
      processSentimentInGroup = dojo.hitch(this, 
        function (sentimentKey, i) {
          var values = dojo.map(dojox.lang.functional.keys(groups), 
            dojo.partial(getSentimentInGroup, sentimentKey));
          this.chart.addSeries(sentimentTypes[sentimentKey].name, values);
        });
      dojo.forEach(dojox.lang.functional.keys(sentimentTypes), 
        processSentimentInGroup);
    }
  });
});

//= require <qubit/GLOBAL>

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.require("dojox.lang.functional");

dojo.addOnLoad(function () {
  dojo.declare("qubit.graph.Chart", [dijit._Widget, dijit._Templated], {
    //widgetsInTemplate: true,
    
    showDetail: false,
    
    templateString: 
      "<div dojoAttachPoint='containerNode' style='" +
      "  width:100%;" +
      "  height:100%;" +
      "  position:absolute;'>" +
      "</div>",
    postCreate: function () {
      this.createChart();
      this.requestData();
    },
    createChart: function () {
      
    },
    requestData: function () {
      qubit.qfeedback.data.DataManager.addOnLoad(dojo.hitch(this, function () {
//        if (this.chartData.groupby && (this.chartData.groupby.length > 0)) {
//          if (this.chartData.groupby.length === 1) {
//            this.dataRecieved(this.mockColumnData());
//          } else {
//            this.dataRecieved(this.mockHeatmapData());
//          }
//        } else {
        qubit.qfeedback.data.DataManager.getFeedbackSentiments(
          this.chartData,
          dojo.hitch(this, this.dataRecieved)
        );
//        }
      }));
    },
    mockColumnData: function () {
      var groups, data;
      data = dojo.map(qubit.qfeedback.data.DataManager.getTrafficSources(), 
        dojo.hitch(this, function (group, i) {
          return {
            start: this.chartData.duration[0].getTime(),
            end: this.chartData.duration[1].getTime(),
            trafficsource: group.id,
            sentiments: {
              0: i * 50 + 10,
              1: i * 30 + 3,
              2: i * 10
            }
          };
        }));
      return data;
    },
    mockHeatmapData: function () {
      var data, chartData = this.chartData;
      data = dojo.map(qubit.qfeedback.data.DataManager.getTrafficSources(), 
        function (ts, i) {
          return dojo.map(qubit.qfeedback.data.DataManager.getPageCategories(), 
            function (pc, j) {
              return {
                start: chartData.duration[0].getTime(),
                end: chartData.duration[1].getTime(),
                trafficsource: ts.id,
                pagecategory: pc.id,
                sentiments: {
                  0: parseInt(Math.random() * 30, 10),
                  1: parseInt(Math.random() * 5, 10),
                  2: parseInt(Math.random() * 30, 10)
                }
              };
            });
        });
      return _.flatten(data);
    },
    dataRecieved: function (data) {
      this.preprocessData(data);
      this.plot();
    },
    populateChart: function () {
      
    },
    preprocessData: function (data) {
      this.data = this.formatData(data);
    },
    formatData: function (data) {
      dojo.forEach(data, function (d) {
        d.start = new Date(d.start);
        d.end = new Date(d.end);
        d.sentiments[0] += parseInt(Math.random() * 5, 10);
        d.sentiments[1] += parseInt(Math.random() * 5, 10);
        d.sentiments[2] += parseInt(Math.random() * 5, 10);
      }); 
      return data;
    },
    getData: function () {
      var chartData, data;
      
      chartData = [];
      data = this.data;

      if (this.data.length > 0) {
        chartData.push({
          dates: [new Date(0), data[0].start]
        });
      }
      
      dojo.forEach(data, this.processData(chartData));
      
      if (this.data.length > 0) {
        chartData.push({
          dates: [data[data.length - 1].end, 
            new Date(data[data.length - 1].end.getTime() * 2)]
        });
      }
      return chartData;
    },
    processData: function (chartData) {
      if (!this.chartData.groupby) {
        return this.processUngroupedData(chartData);
      } else {
        return this.processGroupedData(chartData);
      }
    },
    processUngroupedData: function (chartData) {
      return dojo.hitch(this, function (dataEl, i) {
        var f, values, sentimentTypes, chartDataEl;
        f = dojox.lang.functional;
        values = {};
        values = dojo.mixin({}, dataEl.sentiments);
        values[qubit.qfeedback.data.FeedbackSentiment.all] =
          f.foldl1(f.values(dataEl.sentiments),
            function (a, b) {
              return a + b;
            });
        chartDataEl = {
          dates: [dataEl.start, dataEl.end]
        };
        chartDataEl.values = {};
        chartDataEl.values[qubit.qfeedback.data.DataManager.ungrouped] = values;
        chartData.push(chartDataEl);
      });
    },
    processGroupedData: function (chartData) {
      var dateBuckets, getDateBucket;
      dateBuckets = {};
      getDateBucket = dojo.hitch(this, function (dataEl) {
        if (!dateBuckets[dataEl.start]) {
          var chartDataEl = {
            dates: [dataEl.start, dataEl.end],
            values: {}
          };
          chartData.push(chartDataEl);
          dateBuckets[dataEl.start] = chartDataEl; 
        }
        return dateBuckets[dataEl.start];
      });
      return dojo.hitch(this, function (dataEl) {
        var f, dateBucket, groupBucket, key;
        f = dojox.lang.functional;
        dateBucket = getDateBucket(dataEl);
        groupBucket = {};
        dojo.forEach(f.keys(dataEl.sentiments), function (sentimentKey) {
          groupBucket[sentimentKey] = dataEl.sentiments[sentimentKey];
        });
        groupBucket[qubit.qfeedback.data.FeedbackSentiment.all] = 
          f.foldl1(
            f.values(dataEl.sentiments), 
            function (a, b) {
              return a + b;
            }
          );
        key = dojo.map(this.chartData.groupby, function (group) {
          return dataEl[group];
        });
        key = f.foldl1(key, function (a, b) { 
          return a + "," + b;
        });
        dateBucket.values[key] = groupBucket;
      });
    }
  });
});
//= require <qubit/graph/_Graph>
//= require <qubit/Util>

dojo.require("dojox.math.stats");
dojo.addOnLoad(function () {
  dojo.declare("qubit.graph.Heatmap", [qubit.graph.Chart], {
    templateString: 
      "<div " +
      "  class='qubit_graph_Heatmap' " +
      "  dojoAttachPoint='containerNode' " +
      "  style='" +
      "    width:500px;" +
      "    height:300px;" +
      "    position:absolute;'" +
      ">" +
      "  <table dojoAttachPoint='tableNode'" +
      "    style='" +
      "      width:100%;" +
      "      table-layout:fixed;" +
      "  '>" +
      "    <tbody dojoAttachPoint='tbodyNode'>" +
      "    </tbody>" +
      "  </table>" +
      "</div>",
    createChart: function () {
    },
    plot: function () {
      var cd, data;
      data = this.formatChartData(this.getData());
      this.drawTable(data);
    },
    formatChartData: function (chartData) {
      var data, values, f;
      data = {};
      values = chartData[1].values;
      f = dojox.lang.functional;
      dojo.forEach(f.keys(values), function (key) {
        var keys, row;
        keys = key.split(",");
        row = data[keys[0]];
        if (!row) {
          row = {};
          data[keys[0]] = row;
        }
        row[keys[1]] = values[key];
      });
      return data;
    },
    drawTable: function (data) {
      this.drawColumnHeaders(data);
      this.drawHeatCells(data);
    },
    drawColumnHeaders: function (data) {
      var f, headerTypes, row, columnKeys, cellWidth;
      f = dojox.lang.functional;
      headerTypes = qubit.qfeedback.data.DataManager.getDataForCategory(
        this.chartData.groupby[1]
      );
      row = this.tbodyNode.insertRow(-1);
      columnKeys = f.keys(data[f.keys(data)[0]]);
      cellWidth = this.determineCellWidth(columnKeys);
      row.insertCell(-1).width = '25%'; 
      dojo.forEach(columnKeys, function (colKey) {
        var cell = row.insertCell(-1);
        qubit.Util.setText(cell, headerTypes[colKey].name);
        cell.width = '25%';
      });
    },
    determineCellWidth: function (columnKeys) {
      return (100 / (columnKeys.length + 1)) + "%";
    },
    drawHeatCells: function (data) {
      var f, tbody;
      tbody = this.tbodyNode;
      dojo.forEach(dojox.lang.functional.keys(data), 
        dojo.hitch(this, dojo.partial(this.drawRow, data)));
    },
    drawRow: function (data, rowKey) {
      var row = this.tbodyNode.insertRow(-1);
      this.drawRowHeader(row, rowKey);
      dojo.forEach(dojox.lang.functional.keys(data[rowKey]), 
        dojo.hitch(this, dojo.partial(this.drawCell, row, rowKey, data)));
    },
    drawRowHeader: function (row, rowKey) {
      var header = row.insertCell(-1);
      qubit.Util.setText(header, 
        qubit.qfeedback.data.DataManager
                .getDataForCategory(this.chartData.groupby[0])[rowKey].name);
    },
    drawCell: function (row, rowKey, data, colKey) {
      var col, colData, opacity;
      col = row.insertCell(-1);
      colData = data[rowKey][colKey];
      col.style.backgroundColor = 
        this.getCellColour(this.calculateGoodness(colData));
      //Calculates 10% confidence
      opacity = Math.sqrt(colData[0] + colData[1] + colData[2]) / 10;
      if (opacity > 1) {
        opacity = 1;
      }
      col.style.opacity = opacity;
      col.title = parseInt(this.calculateGoodness(colData) * 100, 10) + "% - " +
        "Pos: " + colData[0] + ", Neu: " + colData[1] + ", Neg: " + colData[2];
      col.height = '30px';
    },
    getCellColour: function (goodness) {
      if (goodness > 0.5) {
        return dojo.blendColors(new dojo.Color('#0f0'), 
          new dojo.Color('#ff7f00'), 1 - (goodness - 0.5) * 2).toHex();
      } else {
        return dojo.blendColors(new dojo.Color('#ff7f00'), 
          new dojo.Color('#f00'), 1 - goodness * 2).toHex();
      }
    },
    calculateGoodness: function (colData) {
      return (colData[0] + colData[1] * 0.5) /
        //dojox.math.stats.sum(dojox.lang.functional.values(colData));
        (colData[0] + colData[1] + colData[2]);
    }
  });
});

//= require <qubit/GLOBAL>
//= require <qubit/qfeedback/data/DataManager>

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dojox.layout.ExpandoPane");

dojo.addOnLoad(function () {
  var height = 190;
  dojo.declare("qubit.graph.SingleFeedbackViewer", 
    [dijit._Widget, dijit._Templated], 
    {
      widgetsInTemplate: true,
      text: "some text",
      templateString: "<div style='width: 100%; height: " + height + "px;'>" + 
        "<div " +
        "    dojoType='dijit.layout.BorderContainer' " +
        "    design='sidebar' " + 
        "    style='width: 100%; height: 100%;' " +
        "    dojoAttachPoint='outerBC'>" + 

        "  <div " +
        "      dojoAttachPoint='detailNode' " +
        "      dojoType='dijit.layout.ContentPane' " +
        "      region='center'" +
        "  >" +

        "    <div dojoAttachPoint='textNode' />" +
        "    </div>" +
        "  </div>" + 

        "  <div " +
        "      dojoType='dojox.layout.ExpandoPane' " +
        "      region='leading' " +
        "      startExpanded='false' " +
        "      title='Feedback Details'>" +

        "    <div>#<span dojoAttachPoint='numberNode' >" +
        "      </span></div>" +
        "    <div>Referrer<span dojoAttachPoint='referrerNode' >" +
        "      </span></div>" +
        "    <div>URL<span dojoAttachPoint='exitUrlNode' >" +
        "      </span></div>" +
        "    <div>Page Views<span dojoAttachPoint='pageViewsNode' >" +
        "      </span></div>" +
        "    <div>Bias<span dojoAttachPoint='biasNode' >" +
        "      </span></div>" +
        "    <div>Page Category<span dojoAttachPoint='pageCategoryNode' >" +
        "      </span></div>" +
        "    <div>Traffic Source<span dojoAttachPoint='trafficSourceNode' >" +
        "      </span></div>" +
        "    <div>Feedback Category" +
        "      <span dojoAttachPoint='feedbackCategoryNode' >" +
        "      </span></div>" +
        "    <div>Returning?<span dojoAttachPoint='isReturningNode' >" +
        "      </span></div>" +
        "  </div>" + 
        "</div>",
      attributeMap: {
        text: {node: "textNode", type: "innerHTML"},
        number: {node: "numberNode", type: "innerHTML"},
        referrer: {node: "referrerNode", type: "innerHTML"},
        exitUrl: {node: "exitUrlNode", type: "innerHTML"},
        pageViews: {node: "pageViewsNode", type: "innerHTML"},
        bias: {node: "biasNode", type: "innerHTML"},
        pageCategory: {node: "pageCategoryNode", type: "innerHTML"},
        trafficSource: {node: "trafficSourceNode", type: "innerHTML"},
        feedbackCategory: {node: "feedbackCategoryNode", type: "innerHTML"},
        isReturning: {node: "isReturningNode", type: "innerHTML"}
      }
    });
  qubit.graph.SingleFeedbackViewer.height = height;
});
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>

dojo.addOnLoad(function () {
  dojo.declare("qubit.data._Payment", null, {
    constructor: function () {
      
    },
    getCardTypes: function (cb) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/payment/cardTypes",
        handleAs: "json",
        preventCache: false,
        load: dojo.hitch(this, dojo.partial(this.getCardTypesLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    getCardTypesLoaded: function (cb, cardTypes) {
      if (cb) {
        cb(cardTypes);
      }
    },
    submitPayment: function (name, number, end, countryCode, type, 
        vatNumber, cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.user +
          "/payment/register",
        content: {
          cardHolderName: name,
          cardNumber: number,
          expiryDate: end,
          cardTypeCode: type,
          countryCode: countryCode,
          companyTaxCode: vatNumber
        },
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.submitPaymentLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    submitPaymentLoaded: function (cb, response) {
      if (cb) {
        cb(response);
      }
    },
    getCountries: function (cb) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/payment/countries",
        handleAs: "json",
        preventCache: false,
        load: dojo.hitch(this, dojo.partial(this.getCountriesLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    getCountriesLoaded: function (cb, countries) {
      if (cb) {
        cb(countries);
      }
    }
  });
  qubit.data.Payment = new qubit.data._Payment();
});
dojo.addOnLoad(function () {
  dojo.declare("qubit.data._Permissions", null, {
    constructor: function () {
    },
    isPermitted: function (permissionType) {
      var perms, cookieName, i, j, x, y, ARRcookies;
      ARRcookies = document.cookie.split(";");
      cookieName = "prm";
      for (i = 0; i < ARRcookies.length; i = i + 1) {
        x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
        y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
        x = x.replace(/^\s+|\s+$/g, "");
        if (x === cookieName) {
          perms = y.split("|");
          for (j = 0; j < perms.length; j = j + 1) {
            if (perms[j] === permissionType) {
              return true;
            }
          }
          break;
        }
      }
      return false;
    },
    setupButton: function (button, env, onclick, requiredPermission) {
      if (qubit.data.Permissions.isPermitted(requiredPermission)) {
        this.enableButton(button, env, onclick);
      } else {
        this.disableButton(button);
      }
    },
    enableButton: function (button, env, onclick) {
      dojo.connect(button, "onClick", env, onclick);
      button.set("disabled", false);
    },
    disableButton: function (button) {
      button.set("disabled", true);
    }
  });
  qubit.data.Permissions = new qubit.data._Permissions();
});
/*global console*/
dojo.addOnLoad(function () {
  dojo.declare("qubit.data.Client", null, {
    constructor: function (id, name, paymentWhitelisted, ccApproved) {
      this.id = id;
      this.name = name;
      this.paymentWhitelisted = paymentWhitelisted; 
      this.ccApproved = ccApproved; 
    }
  });
});
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>
//= require <qubit/data/Client>
//= require <qubit/widget/base/Log>

dojo.require("dojox.encoding.digests.SHA1");

dojo.addOnLoad(function () {
  var log = new qubit.widget.base.Log("_UserManager: ");
  
  dojo.declare("qubit.data._UserManager", null, {
    mockDb: false,
    mockTimeout: false,
    constructor: function () {
    },
    register: function (email, name, password, cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + "/register" +
          "?email=" + encodeURIComponent(email) +
          "&username=" + encodeURIComponent(email) +
          "&name=" + encodeURIComponent(name) +
          "&product=opentag" +
          "&password=" + 
          encodeURIComponent(dojox.encoding.digests.SHA1(password)),
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.loginLoaded, cb)),
        error: qubit.globalErrorHandler
        
      });
    },
    addAccountUser: function (email, name, password, role) {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/userForAccount" +
          "?email=" + encodeURIComponent(email) +
          "&username=" + encodeURIComponent(email) +
          "&name=" + encodeURIComponent(name) +
          "&product=opentag" +
          "&roleId=" + role +
          "&password=" + 
          ((password === "") ? "" : 
            encodeURIComponent(dojox.encoding.digests.SHA1(password))),
        handleAs: "json",
        error: qubit.globalErrorHandler
      }).then(dojo.hitch(this, this.handleNewAccountUser));
    },
    handleNewAccountUser: function (response) {
      return {
        ok: response.status === "OK",
        errorCode: response.errorCode, 
        reason: response.msg
      };
    },
    login: function (username, password, cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + "/login" +
          "?username=" + encodeURIComponent(username) +
          "&password=" + 
          encodeURIComponent(dojox.encoding.digests.SHA1(password)),
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.loginLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    loginLoaded: function (cb, response) {
      var ok = response.status === "OK";
      if (cb) {
        if (ok) {
          this.getClientDetails(dojo.partial(cb, true));
        } else {
          cb(false, response.errorCode, response.msg);
        }
      }
      if (ok) {
        this.setupNextKeepalive();
      }
    },
    logout: function (cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + "/logout",
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.logoutLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    logoutLoaded: function (cb, response) {
      cb(response.status);
    },
    stayAlive: function (cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + "/genskey",
        handleAs: "json",
        load: dojo.hitch(this, dojo.partial(this.stayedAlive, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    stayedAlive: function (cb, response) {
      var alive = (!!dojo.cookie("si")) && (response.status === "OK");
      if (cb && dojo.isFunction(cb)) {
        cb(alive);
      }
      if (alive) {
        this.setupNextKeepalive();
      } else {
        this.sessionInvalid();
      }
    },
    sessionInvalid: function () {
      window.location.reload();
    },
    setupNextKeepalive: function () {
      setTimeout(dojo.hitch(this, this.stayAlive), 60000);
    },
    getClientDetails: function (cb) {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + "/client",
        handleAs: "json",
        handle: dojo.hitch(this, dojo.partial(this.getClientDetailsLoaded, cb)),
        preventCache: true
      });
    },
    getClientDetailsLoaded: function (cb, response) {
      if (response.status === 401) {
        if (cb) {
          cb(null, "Not logged in");
        }
        return null;
      } else {
        this.client = new qubit.data.Client(response.id, response.name, 
          response.paymentWhitelisted, response.ccApproved);
        if (cb) {
          cb(this.client);
        }
        return this.client;
      }
    },
    getUser: function (cb) {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + "/user",
        handleAs: "json",
        preventCache: true
      }).then(dojo.hitch(this, dojo.partial(this.getUserLoaded, cb)));
    },
    getUserLoaded: function (cb, user) {
      if (cb) {
        cb(user);
      }
      return user;
    },
    checkPassword: function (password) {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/user/password",
        content: {
          password: dojox.encoding.digests.SHA1(password)
        },
        handleAs: "json"
      });
    },
    resetPassword: function (username, cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.external + 
          "/forgotpassword/send",
        content: {
          username: username
        },
        handleAs: "json",
        handle: dojo.hitch(this, function (message) {
          this.resetPasswordLoaded(message, cb);
        })
      });
    },
    resetPasswordLoaded: function (message, cb) {
      if (cb) {
        cb(message);
      }
    },
    updateEmail: function (email, cb) {
      dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + "/user" +
          "?email=" + encodeURIComponent(email),
        handleAs: "json",
        load: cb,
        error: dojo.hitch(this, dojo.partial(qubit.forwardingErrorHandler, cb))
      });
    },
    updatePassword: function (oldpassword, newpassword, cb) {
      dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + "/user" +
          "?password=" +
          encodeURIComponent(dojox.encoding.digests.SHA1(oldpassword)) +
          "&newpassword=" + 
          encodeURIComponent(dojox.encoding.digests.SHA1(newpassword)),
        handleAs: "json",
        load: cb,
        error: dojo.hitch(this, dojo.partial(qubit.forwardingErrorHandler, cb))
      });
    },
    resendEmail: function (cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.external +
          "/activate/resend",
        handle: dojo.hitch(this, dojo.partial(this.resendEmailLoaded, cb))
      });
    },
    resendEmailLoaded: function (cb) {
      if (cb) {
        cb();
      }
    },
    setHosted: function (cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/client/setHosted",
        load: cb,
        error: dojo.hitch(this, dojo.partial(qubit.forwardingErrorHandler, cb))
      });
    },
    cancelAccount: function (cb) {
      dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/client/cancelHosting",
        handleAs: "json",
        load: cb,
        error: dojo.hitch(this, dojo.partial(qubit.forwardingErrorHandler, cb))
      });
    },
    getUsers: function () {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + "/account/user",
        handleAs: "json",
        error: qubit.globalErrorHandler
        
      }).then(function (users) {
        return users;
      });
    },
    getProducts: function () {
      var deferred = new dojo.Deferred();
      deferred.resolve([{
        id: 1,
        name: "Opentag"
      }]);
      return deferred;
    },
    removeUserFromClient: function (userId) {
      return dojo.xhrDelete({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/account/user/" + userId,
        handleAs: "json",
        error: qubit.globalErrorHandler
        
      }).then(function (ok) {
        return ok;
      });
    },
    updateUserRole: function (userId, roleId) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/account/user/" + userId + "?roleId=" + roleId,
        handleAs: "json",
        error: qubit.globalErrorHandler
        
      }).then(function (ok) {
        return ok;
      });
    },
    getUserClients: function () {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/user/current/client",
        handleAs: "json",
        error: qubit.globalErrorHandler
        
      });
    },
    changeClient: function (clientId) {
      dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/user/current/client?clientId=" + clientId,
        handleAs: "json",
        error: qubit.globalErrorHandler
      }).then(function () {
        window.location.reload();
      });
    },
    updateClient: function (name) {
      return dojo.xhrPut({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/client/current?name=" + name,
        handleAs: "json",
        error: qubit.globalErrorHandler
      });
    },
    verifyUser: function (userId) {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/user/" + userId + "/reverify",
        handleAs: "json",
        error: qubit.globalErrorHandler
      });
    },
    unlockUser: function (userId) {
      return dojo.xhrPost({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/user/" + userId + "/unlock",
        handleAs: "json",
        error: qubit.globalErrorHandler
      });
    },
    getRoles: function (Id) {
      return dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + "/role",
        handleAs: "json",
        error: qubit.globalErrorHandler
      });
    }
  });
  qubit.data.UserManager = new qubit.data._UserManager();
  
  qubit.globalErrorHandler = function (msg, e) {
    log.ERROR("Unexpected error occured: " +
      msg.responseText ? msg.responseText : msg);
    if (e.xhr.status === 401) {
      window.location.reload();
//    } else {
//      var text = msg.responseText ? msg.responseText : msg;
//      qubit.DefaultNotificationsMgr.notify(
//              "error",
//              "<b>Unexpected error!</b>" +
//                      "Please see console for details.<p/>" + text,
//              5000);
    }
  };
  qubit.forwardingErrorHandler = function (cb, msg, e) {
    if (cb) {
      cb(dojo.fromJson(e.xhr.responseText.trim()));
    }      
  };
});
//= require <qubit/GLOBAL>

dojo.addOnLoad(function () {
  dojo.declare("qubit.data._Urls", null, {
    domain: "/QDashboard",
    user: "/qdashboard", 
    qtag: "/qtag",
    external: "/service",
    qtagStatsDomain: "/QStatsRestAPI",
    qfeedback: "/qfeedback"
  });
  qubit.data.Urls = new qubit.data._Urls();
});
//= require <qubit/GLOBAL>
//= require <qubit/data/Urls>

dojo.addOnLoad(function () {
  dojo.declare("qubit.data._Invoice", null, {
    constructor: function () {
      
    },
    getInvoiceBreakdown: function (invoiceId, cb) {
      dojo.xhrGet({
        url: qubit.data.Urls.domain + qubit.data.Urls.user + 
          "/invoice/breakdown?invoiceId=" + invoiceId,
        handleAs: "json",
        preventCache: false,
        load: dojo.hitch(this, dojo.partial(this.getBreakdownLoaded, cb)),
        error: qubit.globalErrorHandler 
      });
    },
    getBreakdownLoaded: function (cb, invoiceLines) {
      if (cb) {
        cb(invoiceLines);
      }
    }
  });
  qubit.data.Invoice = new qubit.data._Invoice();
});
//= require <qubit/GLOBAL>

(function () {

  function Notification(config) {
    if (config) {
      this.parentContainer = config.parentContainer;
      this.container = config.container;
      this.className = config.className;
      this.maxTime = config.maxTime;
      this.closeable = config.closeable;
      this.init();
    }
  }

  Notification.prototype.init = function () {
    this.container = this.container || document.createElement("div");
    this.container.className += " qubit-notification " + 
      (this.className ? this.className : "");
  };

  Notification.prototype.drawCloseButton = function () {
    var _this = this;
    if (this.closeable) {
      this.closeButton = document.createElement("div");
      if (this.container.childNodes.length === 0) {
        this.container.appendChild(this.closeButton);
      } else {
        this.container.insertBefore(this.closeButton,
          this.container.childNodes[0]);
      }
      this.closeButton.className = "notification-close-button";
      this.closeButton.onclick = function () {
        _this.destroy();
      };
    }
  };

  Notification.prototype.show = function () {
    this.container.style.display = "";
  };

  Notification.prototype.hide = function () {
    this.container.style.display = "none";
  };

  Notification.prototype.setContent = function (content) {
    if (this.content !== content) {
      this.content = content;
      this.container.innerHTML = '';
      if (typeof (content) === "object") {
        this.container.appendChild(content);
      } else {
        this.container.innerHTML = content;
      }
      this.drawCloseButton();
    }
    return content;
  };

  Notification.prototype.paint = function () {
    if (!this.painted) {
      this.parentContainer.appendChild(this.container);
      this.painted = true;
    }
  };

  Notification.prototype.destroy = function () {
    try {
      if (this.onDestroy) {
        this.onDestroy();
      }
    } finally {
      if (this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
  };

  window.qubit.Notification = Notification;

}());
//= require <qubit/GLOBAL>
//= require <qubit/Applications>
//= require <qubit/SplashScreen>
//= require <qubit/data/UserManager>
//= require <qubit/widget/utils/Xhr>
//= require <qubit/widget/utils/Utils>

dojo.registerModulePath("qubit.templates", "/QDashboard/qubit/templates/");
dojo.addOnLoad(function () {
  
  var prev, lastTimeSent,
    Utils = qubit.widget.utils.Utils;

  qubit.data.UserManager.getClientDetails(function (client) {
    var widget;
    if (client && client.id >= 0) {
      //add domain controll frame, its a small hidden frame required to control
      //custom domain. Session page will standalone control
      //this app redirection. The frame can be reused for non OT pages.
      Utils.loadIframe("/QDashboard/session.jsp", "hidden", "session-frame");
      widget = new qubit.Applications();
      widget.placeAt(dojo.body());
      widget.startup();
      qubit.data.UserManager.stayAlive();
    } else {
      widget = new qubit.SplashScreen();
      widget.placeAt(dojo.body());
      widget.startup();
    }
  });

  prev = document.onkeyup;
  lastTimeSent = 0;
  
  document.onkeyup = function (e) {
    try {
      if (prev) {
        prev(e);
      }
    } finally {
      if ((new Date().valueOf() - lastTimeSent) > 60 * 1000) {
        qubit.widget.utils.Xhr.get("ping.jsp");
        lastTimeSent = new Date().valueOf();
      }
    }
  };
});
//= require <qubit/GLOBAL>
//= require <qubit/Register>

dojo.registerModulePath("qubit.templates", "/QDashboard/qubit/templates/");
dojo.registerModulePath("qtag.templates", "/QDashboard/qtag/templates/");
dojo.addOnLoad(function () {
  _gaq.push(['_trackPageview', '/RegisterPage']);
  (new qubit.Register()).placeAt(dojo.body());
});
//= require <qubit/GLOBAL>
//= require <qubit/Util>
//= require <qubit/Register>
//= require <qubit/ForgotPass>
//= require <qubit/data/UserManager>
//= require <qubit/Applications>
//= require <qubit/util/Status>
//= require <qubit/Footer>
//= require <qubit/widget/utils/Utils>

dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.addOnLoad(function () {
  
  var Utils = qubit.widget.utils.Utils;
  
  dojo.declare("qubit.SplashScreen", [dijit._Widget, dijit._Templated], {
    widgetsInTemplate: true,
    templateString: dojo.cache("qubit.templates", "SplashScreen.html?cb=" + 
        qubit.v),
    postCreate: function () {
      _gaq.push(['_trackPageview', '/Login']);
      //dojo.connect(this.register, 'onClick', this, this.registerUser);
      dojo.connect(this.forgot, 'onClick', this, this.forgotPass);
      dojo.connect(this.form, "onSubmit", this, this.submitForm);
      var tmp = function () {
        try {
          var hint = this.passwordField.domNode.children[0].children[1];
          if (this.passwordField.getValue()) {
            hint.innerHTML = "";
          } else {
            hint.innerHTML = "Password";
          }
        } catch (ex) {
          //hack, dojo wont be updated ever so allowed.
        }
      }.bind(this);
      this.passwordField.domNode.onchange = tmp;
    },
    startup: function () {
      this.emailField.focus();
    },
    submitForm: function (e) {
      this.login.set('disabled', true);
      var values = this.form.getValues();
      qubit.data.UserManager.login(values.username, values.password, 
          dojo.hitch(this, this.loginComplete));
      dojo.stopEvent(e);
    },
    loginComplete: function (success, errorCode) {
      if (success) {
        try {
          //replace after login.
          var el = document.getElementById("session-frame");
          el.parentNode.removeChild(el);
        } catch (ex) {
        }
        Utils.loadIframe("/QDashboard/session.jsp",
            "hidden", "session-frame");
        this.showApplication();
      } else {
        if (errorCode === "3500") {
          this.status.error("Your account has been locked. Please contact" +
            " support@qubitproducts.com");          
        } else {
          this.status.error("The email or password you entered is incorrect");
        }
        this.login.set('disabled', false);
      }
    },
    registerUser: function () {
      var register = new qubit.Register({logIn: 
        dojo.hitch(this, this.registrationComplete)});
      register.show();
    },
    registrationComplete: function () {
      this.showApplication();
    },
    forgotPass: function () {
      var forgot = new qubit.ForgotPass({});
      forgot.show();
    },
    showApplication: function () {
      var apps = new qubit.Applications();
      apps.placeAt(dojo.body());
      apps.startup();
      dojo.destroy(this.domNode);
    }
  });
});
