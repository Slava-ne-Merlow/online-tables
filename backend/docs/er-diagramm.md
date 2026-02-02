Enum page_side { 
    left
    right
}
Enum column_type { 
    text
    number
    date
    select
    file
}

//// USERS
Table users {
id int [pk, increment]
email varchar [not null, unique]
name varchar
is_admin boolean [default: false]
password_hash varchar [not null]
}

//// PAGES & SIDES
Table pages {
id int [pk, increment]
name varchar [not null]
slug varchar [not null, unique]
}

Table page_sides {
id int [pk, increment]
page_id int [not null, ref: > pages.id]
side page_side [not null] // left | right
name varchar
indexes { (page_id, side) [unique] }
}

//// COLUMNS (общие)
Table columns {
id int [pk, increment]
side_id int [not null, ref: > page_sides.id]
name varchar [not null]
key varchar  [not null]
type column_type [not null]      // text|number|date|select|file
required boolean [default: false]
position int
indexes { (side_id, key) [unique] }
}

Table select_options {
id int [pk, increment]
column_id int [not null, ref: > columns.id] // только для type=select
label varchar [not null]
value varchar [not null]
sort_order int
is_active boolean [default: true]
indexes { (column_id, value) [unique] }
}

//// FILES
Table files {
id int [pk, increment]
filename varchar [not null]
storage_path varchar [not null, unique]
mime_type varchar
size_bytes bigint
}

//// CELLS (вся фактическая информация)
Table cells {
id int [pk, increment]
side_id int [not null, ref: > page_sides.id]   // левая или правая часть страницы
row_id varchar [not null]                      // идентификатор логической строки, просто строка/UUID
column_id int [not null, ref: > columns.id]

// Ровно одно из следующих значений не NULL
value_text text
value_number decimal(38,10)
value_date date
option_id int [ref: > select_options.id]
file_id int [ref: > files.id]

// Метаданные изменений
updated_by int [ref: > users.id]
updated_at timestamp [default: `now()`]

indexes { (side_id, row_id, column_id) [unique] }
}

//// СВЯЗЬ: несколько правых строк -> одна левая строка
Table right_to_left_links {
id int [pk, increment]
page_id int [not null, ref: > pages.id]
left_row_id varchar [not null]  // идентификатор строки из левой таблицы
right_row_id varchar [not null] // идентификатор строки из правой таблицы
indexes {
(page_id, right_row_id) [unique]
(page_id, left_row_id)
}
}

//// ПРАВА ДОСТУПА
Table page_permissions {
id int [pk, increment]
page_id int [not null, ref: > pages.id]
user_id int [not null, ref: > users.id]
can_read boolean [default: true]
can_write boolean [default: false]
can_admin boolean [default: false]
indexes { (page_id, user_id) [unique] }
}

Table column_permissions {
id int [pk, increment]
column_id int [not null, ref: > columns.id]
user_id int [not null, ref: > users.id]
can_read boolean [default: true]
can_write boolean [default: false]
indexes { (column_id, user_id) [unique] }
}