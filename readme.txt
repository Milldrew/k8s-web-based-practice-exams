This repository is for creating webapps at these URLs:
k8s.milldrew.com          # Landing Page
k8s.milldrew.com/cka      # CKA practice exam list
k8s.milldrew.com/cks      # CKS practice exam list
k8s.milldrew.com/ckad     # CKAD practice exam list


Current todos:
Create a base container of a ubuntu image that can run k3s
Create shell scripts for rebuilding the base image and then rebuilding the k3 images using Dockerfiles


Base image:
ubuntu running k3s, with a node.js server serving a node-pty connection to the container
express app with three endpoints:
  - one websocket endpoint for interacting with the terminal 
  - one http endpoint called /is-correct that returns true if the question is correct
  - one endpoint called /question which delivers the question prompt from a string in the node.js program and the solution
 The value returned by question and solution should come fromm a javascript file question.constants.js  with a plane javascript object named  exports values for question and solution

 The test that is run should be a node.js function that is stored in a file named is-correct
 The file will also be added using a config map that provides the function
