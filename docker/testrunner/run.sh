#!/bin/bash


# Why -i -t ? Because we get nice terminal colours... And could stop the test with ^C
if [[ $NONINTERACTIVE != true ]]
       then
       RUNOPTIONS=" -i -t "
fi

IMAGE_NAME="black-screen_testrunner"
CONTAINER_NAME="bs-testrunner"



# Help?
if [[ $1 == "--help" ]]
  then
  echo "./run.sh [-f] [-b] [path/to/your/black-screen]"
  exit
fi


# Firstly mask the slashes to, because they break the script

if [[ -n $3 ]]
  then
  THIRD="`echo ${2//\//\\/}`"
fi

if [[ -n $2 ]]
  then
  SECOND="`echo ${2//\//\\/}`"
fi

if [[ -n $1 ]]
  then
  FIRST="`echo ${1//\//\\/}`"
fi

#Third argument?

if [[ -n "$THIRD" ]]
  then
  if [[ "$THIRD" == "-b" ]]
    then
    build=true
  elif [[ "$THIRD" == "-f" ]]
    then
    force=true
  else
    path="$THIRD"
  fi
fi



#Third argument?

if [[ -n "$SECOND" ]]
  then
  if [[ "$SECOND" == "-b" ]]
    then
    build=true
  elif [[ "$SECOND" == "-f" ]]
    then
    force=true
  else
    path="$SECOND"
  fi
fi



#Third argument?

if [[ -n "$FIRST" ]]
  then
  if [[ "$FIRST" == "-b" ]]
    then
    build=true
  elif [[ "$FIRST" == "-f" ]]
    then
    force=true
  else
    path="$FIRST"
  fi
fi


# Rebuild the image? Means you need to rebuild the container...
if [[ -n $build ]]
  then
  force=true
fi



#grep the image

image=`docker images | grep "$IMAGE_NAME"`
if [[ ${#image} -lt 1 ]]
  then
  echo "No black-screen_testrunner image available"
  echo "building..."
  code=$(docker build -t "$IMAGE_NAME" .)
  if [[ $code != 0 ]]
  then
    echo "docker build failed :-("
    exit
  fi
elif [[ -n "$build" ]]
  then
  echo "Rebuilding the image..."
  docker rmi -f "$IMAGE_NAME"
  code=$(docker build -t "$IMAGE_NAME" .)
  if [[ $code != 0 ]]
    then
    echo "docker build failed :-("
    exit
  fi
fi



#show the docker processe with the name bs-testrunner
id=`docker ps -aq -f name="$CONTAINER_NAME"`


#Determine if it's an absolute or relative path, substitute if neccessary
if [[ -n $path ]]
  then
  path_available=true
  if [[ ${path:0:2} == './' ]]
    then
    path="`pwd`/$path"
  fi
fi


#a path is given, but the container is already runnig? Sorry, we couldn't continue :-(
if [[ -n $path_available && ${#id} -gt 1 && ! $force ]]
  then
  echo "Sorry, you could not change your repo location in a running container"
  exit
fi

#check if a path is given (arg 1), if not take default
if [[ -n $path_available  ]]
  then
  blackscreen_path="`echo ${path//\//\\/}`"
else
  blackscreen_path="`pwd`/black-screen"
fi


# determine if there's a testrunner container available by checking the length of the id

if [[ ${#id} -gt 1 && -z $force ]]
  then
  echo "Restarting old container..."
  docker restart "$CONTAINER_NAME"
  docker attach "$CONTAINER_NAME"
elif [[ ${#id} -gt 1 ]]
  then
  echo "Force to rebuild the container"
  docker rm -f "$CONTAINER_NAME"
  docker run --name "$CONTAINER_NAME" $RUNOPTIONS -e FORCE=true -v "$blackscreen_path":/black-screen "$IMAGE_NAME"
elif [[ -n $force ]]
  then
  echo "Force to rebuild the container"
  docker run --name "$CONTAINER_NAME" $RUNOPTIONS -e FORCE=true -v "$blackscreen_path":/black-screen "$IMAGE_NAME"
else
  echo "Run the container"
  docker run --name "$CONTAINER_NAME" $RUNOPTIONS -v "$blackscreen_path":/black-screen "$IMAGE_NAME"
fi
