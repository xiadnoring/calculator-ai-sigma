cmake_minimum_required(VERSION 4.2)
project(backend)

find_package(manapihttp REQUIRED)

set(CMAKE_CXX_STANDARD 23)

add_executable(${PROJECT_NAME} main.cpp)

target_link_libraries(${PROJECT_NAME} manapihttp)