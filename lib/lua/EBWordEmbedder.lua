require('torch')
require('nn')

local EBWordEmbedder, parent = torch.class('nn.EBWordEmbedder', 'nn.Container')
local sqlite3 = require("lsqlite3")
local embeddingDB = assert(sqlite3.open("../scripts/word_vectors"))
local vectorRequest = assert(embeddingDB:prepare("SELECT tensor FROM word_vectors WHERE word = ?"))

local globalWordMapping = {}
local globalNextIndex = 1


-- EBWordEmbedder - handles the tricky task of embedding words in vector space.
-- This will use a combination of learned embeddings and fixed embeddings pulled
-- from a database
function EBWordEmbedder:__init(maxExtraSymbols)
    parent.__init(self)

    -- Keep a lookup table for the remaining words
    self.wordVectors = nn.LookupTable(maxExtraSymbols, 300)

    -- Add the lookup table so the vectors can be learned
    self:add(self.wordVectors)
end


function EBWordEmbedder:bytesToString(bytes)
    local s = {}
    for i = 1, bytes:size(1) do
        s[i] = string.char(bytes[i])
    end
    return table.concat(s)
end

function EBWordEmbedder:updateOutput(input)
    -- The input must be a table of words. We look up each word in the database
    local vectors = {}

    local outputTensor = torch.zeros(#input, 300)

    local lookupTensor = torch.LongTensor(1)
    for n=1,#input do
        --print(input[n])
        local word = input[n]

        --print(torch.type(word))

        --print(embeddingDB:error_message())
        if torch.type(word) == 'torch.ByteTensor' then
            -- Create a string from the byte tensor
            vectorRequest:bind_values(self:bytesToString(word))

            local count = 0
            for row in vectorRequest:nrows() do
                count = count + 1
                outputTensor[n]:copy(torch.deserialize(vectorRequest:get_value(0)))
            end
            vectorRequest:reset()

            if count == 0 then
                local wordIndex = globalWordMapping[word]
                if wordIndex == nil then
                    wordIndex = globalNextIndex
                    globalNextIndex = globalNextIndex + 1
                    globalWordMapping[word] = wordIndex
                end
                lookupTensor[1] = wordIndex
                outputTensor[n]:copy(self.wordVectors:updateOutput(lookupTensor))
            end
        end
    end
--
--    -- Zero the output
--    self.outputTensor:resize(batchSize, self.outputSize)
--    self.outputTensor:zero()
--
--    -- Remove the bottom dimension, if it exists
--    local baseInput = input:view(batchSize)
--
--    -- Go through each item in the batch, set the one-hot
--    -- value
--    for n=1,batchSize do
--        local value = baseInput[n]
--        if value > 0 then
--            self.outputTensor[n][value] = 1
--        end
--    end

    return outputTensor
end

function EBWordEmbedder:updateGradInput(input, gradOutput)
    local outputTensor = torch.Tensor(#input, 300)

    local lookupTensor = torch.LongTensor(1)
    for n=1,#input do
        local word = input[n]
        local gradient = gradOutput[n]

        local wordIndex = globalWordMapping[word]
        if wordIndex ~= nil then
            lookupTensor[1] = wordIndex
            self.wordVectors:updateGradInput(lookupTensor, gradient)
        end
    end

    self.gradInput = EBWordEmbedder.recursiveEmptyTensor(input)
    return self.gradInput
end



function EBWordEmbedder.recursiveEmptyTensor(t2)
    if torch.type(t2) == 'table' then
        local t1 = {}
        for key,_ in pairs(t2) do
            t1[key] = EBWordEmbedder.recursiveEmptyTensor(t2[key])
        end
        return t1
    elseif torch.isTensor(t2) then
        local t1 = t2.new()
        t1:resizeAs(t2)
        t1:zero()
        return t1
    else
        error("expecting tensor or table thereof. Got "
                ..torch.type(t2).." instead")
    end
end


function EBWordEmbedder:type(type, typecache)
    return parent.type(self, type, typecache)
end
