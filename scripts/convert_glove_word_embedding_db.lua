local torch = require('torch')
local sqlite3 = require("lsqlite3")

local file = torch.DiskFile('glove.6B.300d.txt', 'r')

local db = sqlite3.open("word_vectors")
db:exec[[
  CREATE TABLE word_vectors (
    word      VARCHAR PRIMARY KEY,
    tensor    VARCHAR
  );
]]

--
--local bulkInsertCall = ""
--local count = 0
--
--function flushToDB()
--    local error = db:exec(bulkInsertCall)
--    if error ~= sqlite3.OK then
--        print("Error:",  db:error_message())
--        print(" In Statement:",  bulkInsertCall)
--    end
--    bulkInsertCall = ""
--    count = 0
--end


local insertCall = db:prepare("INSERT INTO word_vectors VALUES(?, ?);")

local total = 0

while not file:hasError() do
   local line = file:readString("*l")
    local columns = {}
    for w in string.gfind(line, "(%S+)%s*") do
        table.insert(columns, w)
    end

    local word = columns[1]
    local tensor = torch.FloatTensor(300)
    for n=2,301 do
        tensor[n - 1] = tonumber(columns[n])
    end

    local storage = torch.serialize(tensor)


    insertCall:bind_values(word, storage)
    insertCall:step()
    insertCall:reset()

    total = total + 1
    if total % 1000 == 0 then
        print("Completed", total)
    end

--    bulkInsertCall = bulkInsertCall .. insertCall
--    count = count + 1
--    if count > 1000 then
--        flushToDB()
--    end

end

flushToDB()
