# Tracks Vigilante Chrome Extension

The purpose of this **Chrome extension** is to add the ability to sniff the traffic sent through https://pixel.wp.com/.

While developing new events for Calypso, we often have to open the browser console and take a look at the network traffic and see what events have we sent through URL parameters, which sometimes is a bit hard to identify due to the great number of parameters those requests contains in the query. We don't want our eyes to be damaged for this task :) 


# How does it work?

It's a simple plugin, written in pure JavaScript and HTML, not making use of any framework like babel.js or Webpack. 
![Tracks-vigilante](https://user-images.githubusercontent.com/5689927/136968545-78b6e38b-b768-401b-93ad-8efbc4294b48.png)

By clicking on the icon we can see already our requests to https://pixel.wp.com/, filter by any event type (for Tracks events), and additionally, we have a filter where we can add a string to filter by any property or value (not only for Tracks events).

# Which kind of events can we sniff?

So far I've found that we send information relative to "Calypso" (blue), "External stats" (orange) and "Grafana" (red).

We can select which kind of events we want to see, and usually, the ones that we care about the most are the "Calypso" events, the ones that are sent to the https://pixel.wp.com/t.gif endpoint.

# How to install this plugin?

You must download all the contents of this repository into a folder, and install it in Chrome through the developer mode. This means that you can add Chrome Extensions unpacked and unsigned.
