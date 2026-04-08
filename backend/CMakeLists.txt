cmake_minimum_required(VERSION 3.9)
project(backend)

find_package(manapihttp REQUIRED)
find_package(PostgreSQL REQUIRED)

set(CMAKE_CXX_STANDARD 23)

add_executable(${PROJECT_NAME} main.cpp
        impl.cpp)

message(STATUS "libpq: libs=${PostgreSQL_LIBRARIES} include=${PostgreSQL_INCLUDE_DIRS}")
target_link_libraries(${PROJECT_NAME} manapihttp ${PostgreSQL_LIBRARIES})
target_include_directories(${PROJECT_NAME} PUBLIC ${PostgreSQL_INCLUDE_DIRS})