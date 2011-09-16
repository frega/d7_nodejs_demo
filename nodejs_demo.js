(function ($) {
  var chart, chartData = [];
  Drupal.NodejsDemo = {};
  Drupal.NodejsDemo.drawChart = function(chartData) {
    if (!chart) {
      chart = new google.visualization.LineChart(document.getElementById('nodejs-demo-stream-wrapper') ) ;
    }
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'ts');
    data.addColumn('number', 'Value');
    data.addColumn('number', 'Exciting Value');
    var len = chartData.length;
    data.addRows(len);
    for (var i = 0; i < len; i++) {
      data.setValue(i, 0, chartData[i].ts.toString() );
      data.setValue(i, 1, parseInt( chartData[i].value) );
      data.setValue(i, 2, parseInt( chartData[i].exciting_value) );
    }
    chart.draw(data, {width: 400, height: 240, title: 'Visualisation of something interesting'});
  };

  // example callback
  Drupal.Nodejs.callbacks.nodejsDemoExample = {
    callback: function (message) {
      // filter for the right channel and correct type
      if (message.channel == 'nodejs_demo_broadcast' && message.data) {
        console.log('nodejsDemoExample');
        if (chartData.length > 50) {
          chartData.shift();
        }
        chartData.push(message.data);
        Drupal.NodejsDemo.drawChart(chartData);
      }
    }
  };



Drupal.behaviors.nodejs_demo = {
    attach: function (context, settings) {
      // only once
      $('#nodejs-demo-trigger', context).click( function() {
        if (Drupal.Nodejs.socket) {
          var message = {
            authToken: Drupal.settings.nodejs.authToken,
            channel: 'nodejs_demo_chaos',
            data: {
              'op': 'reset'
            },
            type: 'something'
          };
          Drupal.Nodejs.socket.emit('message', message);
        }
        return false;
      });
    }
  };

})(jQuery);


