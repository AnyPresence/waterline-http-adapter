![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# waterline-waterline-http

Provides easy access to `waterline-http` from Sails.js & Waterline.

This module is a Waterline/Sails adapter, an early implementation of a rapidly-developing, tool-agnostic data standard.  Its goal is to provide a set of declarative interfaces, conventions, and best-practices for integrating with all sorts of data sources.  Not just databases-- external APIs, proprietary web services, or even hardware.

Strict adherence to an adapter specification enables the (re)use of built-in generic test suites, standardized documentation, reasonable expectations around the API for your users, and overall, a more pleasant development experience for everyone.


### Installation

To install this adapter, run:

```sh
$ npm install waterline-waterline-http
```




### Usage

This adapter exposes the following methods:

###### `request(methodName, context, cb)`

methodName should be the CRUD operation you wish to perform - 'read', 'update', 'create' or 'delete'.
context is an object containing the following keys:

* currentUser
* *currentObject*
* session

currentObject is the object we'd be expecting to deal with in this context. For example, if we 
were dealing with a 'category' object, a user may want to interpolate 'category.id' into a parameter.
In this case, context would contain the 'category' object. 

### Running the tests

In your adapter's directory, run:

```sh
$ npm test
```