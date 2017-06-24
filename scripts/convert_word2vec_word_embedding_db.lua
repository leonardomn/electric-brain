local torch = require('torch')
local sqlite3 = require("lsqlite3")

local db = sqlite3.open("word_vectors")
db:exec[[
  CREATE TABLE word_vectors (
    word      VARCHAR PRIMARY KEY,
    tensor    VARCHAR
  );
]]

local insertCall = db:prepare("INSERT INTO word_vectors VALUES(?, ?);")

file = torch.DiskFile("GoogleNews-vectors-negative300.bin",'r')
local max_w = 50


function readStringv2(file)  
	local str = {}
	for i = 1,max_w do
		local char = file:readChar()
		
		if char == 32 or char == 10 or char == 0 then
			break
		else
			str[#str+1] = char
		end
	end
	str = torch.CharStorage(str)
	return str:string()
end





--Reading Header
file:ascii()
words = file:readInt()
size = file:readInt()


local w2vvocab = {}
local v2wvocab = {}
local M = torch.FloatTensor(words,size)

local total = 0

--Reading Contents
file:binary()
for i = 1,words do
	local str = readStringv2(file)
	local vecrep = file:readFloat(300)
	vecrep = torch.FloatTensor(vecrep)
	local norm = torch.norm(vecrep,2)
	if norm ~= 0 then vecrep:div(norm) end


	local storage = torch.serialize(vecrep)

	insertCall:bind_values(str, storage)
	insertCall:step()
	insertCall:reset()

	total = total + 1
	if total % 1000 == 0 then
		print("Completed", total)
	end

end

flushToDB()


