/*
████████╗███████╗███████╗████████╗██╗███╗   ██╗ ██████╗     
╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║████╗  ██║██╔════╝     
   ██║   █████╗  ███████╗   ██║   ██║██╔██╗ ██║██║  ███╗    
   ██║   ██╔══╝  ╚════██║   ██║   ██║██║╚██╗██║██║   ██║    
   ██║   ███████╗███████║   ██║   ██║██║ ╚████║╚██████╔╝    
   ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝     
                                                          
   
  */
 
//Varables
 
//Varables
 
//neccessary variables for the browser
var window, document, ARGS, $, jQuery, moment, kbn;
 
//dictionary of panel titles
var titles = [
    "Memory",                     //0  bytes
    "Load",                       //1  short
    "Memory LTV",                 //2  bytes
    "Load LTV",                   //3  short
    "Memory Usage",               //4  percent
    "CPU",                        //5  percent
    "Memory Usage LTV",           //6  percent
    "CPU LTV",                    //7  percent
    "Per Process CPU Usage",      //8  percent
    "Per Process Mem Usage",      //9  bytes
    "Per Process CPU Usage LTV",  //10 percent
    "Per Process Mem Usage LTV",  //11 bytes
    "Disk I/O Requests",          //12 iops
    "Disk Usage ",                //13 bytes
    "Disk I/O Requests LTV",      //14 iops
    "Disk Usage LTV",             //15 bytes
    "Disk Usage ",                //16 bytes
    "Disk I/O Time",              //17 ms
    "Disk Usage LTV",             //18 bytes
    "Disk I/O Time LTV",          //19 ms
    "Network Packets",            //20 pps
    "Network Usage",              //21 bps
    "Network Packets LTV",        //22 pps
    "Network Usage LTV",          //23 bps
    "Packets Dropped",            //24 short
    "Packets Error",              //25 short
    "Packets Dropped LTV",        //26 short
    "Packets Error LTV"           //27 short
];
 
//Used for getting hosts that have procstat information
var tester = RegExp(/(lb)|(ats)|(wiki)|(influx)|(jira)/);
 
//Setting the various yaxes of the graphs. These determine the what values are shown.
//First in the list is the left axes that is the one typically shown, the second is 
//the right axes. I have not seen axes need for it, but it is needed for axes valid dashboard.
var yaxes = {
  bytes: [    {
        "format": "bytes",
        "label": null,
        "logBase": 1,
        "max": null,
        "min": "0",
        "show": true
      },
      {
        "format": "short",
        "label": null,
        "logBase": 1,
        "max": null,
        "min": null,
        "show": false
      }],
  short: [    {
        "format": "short",
        "label": null,
        "logBase": 1,
        "max": null,
        "min": null,
        "show": true
      },
      {
        "format": "short",
        "label": null,
        "logBase": 1,
        "max": null,
        "min": null,
        "show": false
      }],
  percent: [    {
        "format": "percent",
        "label": null,
        "logBase": 1,
        "min": "0",
        "show": true
      },
      {
        "format": "short",
        "label": null,
        "logBase": 1,
        "max": null,
        "min": null,
        "show": false
      }],
  bps: [    {
        "format": "bps",
        "label": null,
        "logBase": 1,
        "max": null,
        "min": null,
        "show": true
      },
      {
        "format": "short",
        "label": null,
        "logBase": 1,
        "max": null,
        "min": null,
        "show": false
      }],
  pps: [    {
        "format": "pps",
        "label": null,
        "logBase": 1,
        "max": null,
        "min": null,
        "show": true
      },
      {
        "format": "short",
        "label": null,
        "logBase": 1,
        "max": null,
        "min": null,
        "show": false
      }],
  iops: [    {
        "format": "iops",
        "label": null,
        "logBase": 1,
        "max": null,
        "min": null,
        "show": true
      },
      {
        "format": "short",
        "label": null,
        "logBase": 1,
        "max": null,
        "min": null,
        "show": true
      }],
  ms: [  {
      "format": "ms",
      "label": null,
      "logBase": 1,
      "max": null,
      "min": null,
      "show": true
    },
    {
      "format": "short",
      "label": null,
      "logBase": 1,
      "max": null,
      "min": null,
      "show": true
    }]
};
 
//series overrides. Creates axes nicer graph for disk R/W and network input/output
var overrides = {
  one: [{
      "alias": "/in$/",
      "transform": "negative-Y"
    }],
  two: [{
      "alias": "/read/",
      "transform": "negative-Y"
    }]
};
 
//determines the placement of the panel
var y = 0;
 
 
//variables to hold the POST paramters
var host = "";
var procstat = "";
var disk = "";
var disk2 = "";
 
//the above variables must set before the rest can be done
 
//sets the host from the parameters
if(!_.isUndefined(ARGS.host)) {
  host = ARGS.host;
}
 
//sets the datasource from the parameters
if(!_.isUndefined(ARGS.procstat)){
  procstat = ARGS.procstat;
}
 
if(!_.isUndefined(ARGS.disk)){
  disk = ARGS.disk;
}
 
if(!_.isUndefined(ARGS.disk2)){
  disk2 = ARGS.disk2;
}
 
 
// This should related to the titles array exactly. Add the variables that you need from above
var queries = [
  //Memory query
     "SELECT mean(total) as total, mean(used) as used, mean(cached) as cached, mean(free) as free, mean(buffreed) as buffered  FROM \"mem\" WHERE host = '"+ host +"' AND $timeFilter GROUP BY time($interval), host ORDER BY asc",
  //Load Query
     "SELECT mean(load1) as load1, mean(lead5) as load5, mean(load15) as load15 FROM \"system\" WHERE host = '"+ host +"' AND $timeFilter GROUP BY time($interval), * ORDER BY asc",
  //LTV mem
     "SELECT mean(\"mean_total\") as total, mean(\"mean_used\") as used, mean(\"mean_cached\") as cached FROM \"one_year\".\"downsampled_mem\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY time($interval) fill(null)",
  //LTV load
     "SELECT mean(\"mean_load1\"), mean(\"mean_load5\"), mean(\"mean_load15\") FROM \"one_year\".\"downsampled_system\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY time($interval) fill(null)",
  //Memory used Query
     "SELECT mean(used_percent) as \"Memory Used\" FROM \"mem\" WHERE host = '"+ host +"' AND $timeFilter GROUP BY time($interval)",
  //Cpu query
     "SELECT mean(usage_idle) as \"idle\", mean(usage_user) as \"user\", mean(usage_system) as \"system\", mean(usage_softirq) as \"softirq\", mean(usage_steal) as \"steal\", mean(usage_nice) as \"nice\", mean(usage_irq) as \"irq\", mean(usage_iowait) as \"iowait\", mean(usage_guest) as \"guest\", mean(usage_guest_nice) as \"guest_nice\" FROM \"cpu\" WHERE host = '"+ host +"' AND cpu='cpu-total' AND $timeFilter GROUP BY time($interval), *",
  //LTV Memory used
     "SELECT mean(\"mean_used_percent\") AS \"Used\" FROM \"one_year\".\"downsampled_mem\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY time($interval)",
  //LTV Memory used
     "SELECT mean(\"mean_usage_idle\") AS \"idle\", mean(\"mean_usage_softirq\") AS \"softirq\", mean(\"mean_usage_user\") AS \"user\", mean(\"mean_usage_steal\") AS \"steal\", mean(\"mean_usage_nice\") AS \"nice\", mean(\"mean_usage_iowait\") AS \"iowait\" FROM \"one_year\".\"downsampled_cpu\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY time($interval) fill(null)",
  //cpu procstat query
     "SELECT mean(\"cpu_usage\") FROM \"procstat\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY \"process_name\",  time($interval) fill(null) ",
  //memory procstat query
     "SELECT mean(\"memory_vms\") FROM \"procstat\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY \"process_name\",  time($interval) fill(null)",
  //LTV CPU Procstat
     "SELECT mean(\"mean_cpu_usage\") FROM \"one_year\".\"downsampled_procstat\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY \"process_name\", time($interval) fill(null) ",
  //LTV MEM Procstat
     "SELECT mean(\"mean_memory_vms\") FROM \"one_year\".\"downsampled_procstat\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY \"process_name\", time($interval) fill(null) ",
  //diskio query
     "SELECT non_negative_derivative(mean(reads), 1s) as \"read\",  non_negative_derivative(mean(writes), 1s) as \"write\" FROM \"diskio\" WHERE(\"host\" = '"+ host +"') AND \"name\" =~/(v|s)d[axes-z]$/ AND $timeFilter GROUP BY time($interval), *",
  //disk totalsee query
     "SELECT mean(total) AS \"total\", mean(used) as \"used\" FROM \"disk\" WHERE \"host\" = '"+ host +"' AND \"path\" = '"+ disk +"' AND $timeFilter GROUP BY time($interval)",
  //LTV diskio query
    "SELECT non_negative_derivative(mean(mean_reads), 1s) as \"Read\", non_negative_derivative(mean(mean_writes), 1s) as \"Write\" FROM \"one_year\".\"downsampled_diskio\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY time($interval), * ",
  //LTV disk totals
    "SELECT mean(mean_total) AS \"Total\", mean(mean_used) AS \"Used\" FROM \"one_year\".\"downsampled_disk\" WHERE \"host\" = '"+ host +"' AND \"path\" = '"+ disk +"' AND $timeFilter GROUP BY time($interval)",
  //disk2 query
     "SELECT mean(total) as \"total\", mean(used) as \"used\" FROM \"disk\" WHERE \"host\" = '"+ host +"' AND \"path\" = '"+ disk2 +"' AND $timeFilter GROUP BY time($interval)",
  //read/write time query
     "SELECT non_negative_derivative(mean(read_time),1s) as \"read\", non_negative_derivative(mean(write_time), 1s) as \"write\" FROM \"diskio\" WHERE \"host\" = '"+ host +"' AND \"name\" =~/(v|s)d(axes|b|c|d)$/ AND $timeFilter GROUP BY time($interval), *", 
  //LTV disk2
    "SELECT  mean(mean_total) as \"Total \", mean(mean_used) AS \"Used\" FROM \"one_year\".\"downsampled_disk\" WHERE \"host\" = '"+ host +"' AND \"path\" = '"+ disk2 +"' AND $timeFilter GROUP BY time($interval), \"host\", \"path\"",
  //LTV read/write time
    "SELECT non_negative_derivative(mean(mean_read_time),1s) as \"read\", non_negative_derivative(mean(mean_write_time), 1s) as \"write\" FROM \"one_year\".\"downsampled_diskio\" WHERE \"host\" = '"+ host +"' AND \"name\" =~/(v|s)d(axes|b|c|d)$/ AND $timeFilter GROUP BY time($interval), *", 
  //network packets query
     "SELECT non_negative_derivative(mean(\"packets_recv\"), 10s) as \"in\", non_negative_derivative(mean(\"packets_sent\"), 10s) as \"out\" FROM \"net\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY time($interval) fill(null)",
  //network usage query
     "SELECT non_negative_derivative(mean(bytes_recv), 1s)*8 as \"in\", non_negative_derivative(mean(bytes_sent), 1s) as \"out\" FROM \"net\" WHERE (\"host\" = '"+ host +"') AND  interface =~ /(vlan|eth|bond|ens).*/ AND $timeFilter GROUP BY time($interval), * fill(none)",
  //LTV packets
    "SELECT non_negative_derivative(mean(\"mean_packets_recv\"), 10s) as \"in\", non_negative_derivative(mean(\"mean_packets_sent\"), 10s) as \"out\" FROM \"one_year\".\"downsampled_net\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY time($interval) fill(null)",
  //LTV network usage
    "SELECT non_negative_derivative(mean(mean_byes_recv), 1s)*8 as \"in\", non_negative_derivative(mean(mean_byes_sent), 1s) as \"out\" FROM \"one_year\".\"downsampled_net\" WHERE (\"host\" = '"+ host +"') AND $timeFilter GROUP BY time($interval), * fill(none)",
  //packets dropped query
     "SELECT non_negative_derivative(mean(drop_in), 1s) as \"in\" FROM \"net\" WHERE host = '"+ host +"' AND interface =~ /(vlan|eth|bond|ens).*/ AND $timeFilter GROUP BY time($interval), host,interface fill(none)",
  //netowrk errors query
     "SELECT non_negative_derivative(mean(err_in), 1s) as \"in\" FROM \"net\" WHERE host = '"+ host +"' AND interface =~ /(vlan|eth|bond|ens).*/ AND $timeFilter GROUP BY time($interval), host,interface fill(none)",
  //
    "SELECT non_negative_derivative(mean(\"mean_drop_in\"), 10s) AS \"In\", non_negative_derivative(mean(\"mean_drop_out\"), 10s) AS \"Out\"  FROM \"one_year\".\"downsampled_net\" WHERE host = '"+ host +"' AND $timeFilter GROUP BY time($interval), host,interface fill(none)",
  //
    "SELECT non_negative_derivative(mean(\"mean_err_in\"), 10s) as \"in\"  FROM \"one_year\".\"downsampled_net\" WHERE host = '"+ host +"' AND  $timeFilter GROUP BY time($interval), host,interface fill(none)",
];
 
// Anything that sets an attribute to dashboard is neccessary. Remove and risk not knowing what breaks
 
//variables for managing the dashboard. These dont need to change too much.
var dashboard = {};
dashboard.iteration = 1526303860304;
dashboard.links = [];
dashboard.tags = [];
dashboard.version = 15;
dashboard.uid = "xyLR6aMnl";
dashboard.panels = [];
dashboard.editable = false;
dashboard.gnetId = null;
dashboard.graphTooltip = 0;
dashboard.id = 131;
dashboard.title = host + " Dash";
dashboard.style = "dark";
dashboard.refresh = false;
dashboard.schemaVersion = 16;
dashboard.timezone = "";
 
//time options
dashboard.timepicker = {
  "refreshintervals": [
    "5s",
    "10s",
    "30s",
    "1m",
    "5m",
    "15m",
    "30m",
    "1h",
    "2h",
    "1d"
  ],
  "time_options": [
    "5m",
    "15m",
    "1h",
    "6h",
    "12h",
    "24h",
    "2d",
    "7d",
    "30d"
  ]
};
//sets the inital time span for the dashboard
dashboard.time = {
  "from": "now-6h",
  "to": "now"
};
//templating of the dashboard
dashboard.templating =  {
  "list": [
    {
      "auto": false,
      "auto_count": 30,
      "auto_min": "10s",
      "current": {
        "text": "1m",
        "value": "1m"
      },
      "hide": 0,
      "label": null,
      "name": "Interval",
      "options": [
        {
          "selected": true,
          "text": "1m",
          "value": "1m"
        },
        {
          "selected": false,
          "text": "10m",
          "value": "10m"
        },
        {
          "selected": false,
          "text": "30m",
          "value": "30m"
        },
        {
          "selected": false,
          "text": "1h",
          "value": "1h"
        },
        {
          "selected": false,
          "text": "6h",
          "value": "6h"
        },
        {
          "selected": false,
          "text": "12h",
          "value": "12h"
        },
        {
          "selected": false,
          "text": "1d",
          "value": "1d"
        },
        {
          "selected": false,
          "text": "7d",
          "value": "7d"
        },
        {
          "selected": false,
          "text": "14d",
          "value": "14d"
        },
        {
          "selected": false,
          "text": "30d",
          "value": "30d"
        }
      ],
      "query": "1m,10m,30m,1h,6h,12h,1d,7d,14d,30d",
      "refresh": 2,
      "type": "interval"
    }
  ]
};
//annotations for the head of the json dashboard
dashboard.annotations = {
  "list": [
    {
      "$$hashKey": "object:1293",
      "builtIn": 1,
      "datasource": "-- Grafana --",
      "enable": true,
      "hide": true,
      "iconColor": "rgba(0, 211, 255, 1)",
      "name": "Annotations & Alerts",
      "type": "dashboard"
    }
  ]
};
 
//The meat of the script. This will run through the titles length and ensures that the appropriate 
//panel/row is added to the dashboard. 
for(var i = 0; i < titles.length; i++) {
 
      var tags = "$col";
 
      //sets the tag and skips the procstat panels if not reported
      if(procstat=="false"&&(i==8||i==9||i==10||i==11)) {
        continue;
      } else if(i==8||i==9||i==10||i==11) {
        tags = "$tag_process_name";
      } 
 
      var stacked = false;
      //only CPU graphs will be stacked
      if(titles[i].includes("CPU")&&(!titles[i].includes("Process"))) {
          stacked = true;
      }
 
      //various variables for vital appropriation
      var or = [];
      var axes = [];
      var x = 0;
 
      //sets the horizontal position of the panel
      if(i%2 != 0) {
        x = 12;
      }
 
      //sets overrides for negative y axes graphs
      if(titles[i].includes("I/O")){
        or = overrides.two;
      } else if (titles[i].includes("Network ")) {
        or = overrides.one;
      }
 
      var nullPointMode = "";
      var timeFrom = "";
 
      if(titles[i].includes("LTV")) {
        nullPointMode = "connected";
        timeFrom = "5w";
      }
 
    //sets the value of the yaxes. refer to yaxes to see the values for the yaxes
    //and add here based on the position in the panel you want to add
      switch(i){
        case 0:
        case 2:
        case 9:
        case 11:
        case 13:
        case 15:
        case 16:
        case 18:
          axes = yaxes.bytes;
          break;
        case 1:
        case 3:
        case 24:
        case 25:
        case 26:
        case 27:
          axes = yaxes.short;
          break;
        case 21:
        case 23:
          axes = yaxes.bps;
          break;
        case 20:
        case 22:
          axes = yaxes.pps;
          break;
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 10:
          axes = yaxes.percent;
          break;
        case 12:
        case 14:
          axes = yaxes.iops;
          break;
        case 17:
        case 19:
          axes = yaxes.ms;
          break;
        default:
          axes = [];
          break;
      }
      //Where the panel is added with the specific values evaluated by the script
      dashboard.panels.push({
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "influxdb-sde",
     "fill": 1,
      "gridPos": {
        "h": 6,
        "w": 12,
        "x": x,
        "y": y
      },
      "id": i,
      "legend": {
        "alignAsTable": true,
          "avg": false,
          "current": true,
          "max": true,
          "min": false,
          "show": true,
          "total": false,
          "values": true,
          "rightSide": true,
          "sort": "max",
          "sortDesc": true
      },
      "lines": true,
      "linewidth": 1,
      "links": [],
      "nullePointMode": "null",
      "percentage": false,
      "pointradius": 5,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": or,
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "alias": tags,
          "groupBy": [
            {
              "params": [
                "$_interval"
              ],
              "type": "time"
            },
            {
              "params": [
                "null"
              ],
              "type": "fill"
            }
          ],
          "orderByTime": "ASC",
          "policy": "default",
          "query": queries[i],
          "rawQuery": true,
          "refId": "A",
          "resultFormat": "time_series",
         "select": [
            [
              {
                "params": [
                  "value"
                ],
                "type": "field"
              },
              {
                "params": [],
                "type": "mean"
              }
            ]
          ],
          "tags": []
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeShift": null,
      "title": titles[i],
      "tooltip": {
        "shared": true,
        "sort": 2,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": axes,
      "transparent": true,
      "stack": stacked,
      "nullPointMode": nullPointMode,
      "timeFrom": timeFrom
    });
 
    //modify the y value. since the current spec of the dashboard has two columns, it is only changed on specific values
    if(i%2 != 0) {
      y+=6;
    }
    
 
}
 
return dashboard;
